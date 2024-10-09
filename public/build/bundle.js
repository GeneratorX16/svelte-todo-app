
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Components/CreateTaskItem.svelte generated by Svelte v3.59.2 */
    const file$3 = "src/Components/CreateTaskItem.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let form;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let label1;
    	let t4;
    	let textarea;
    	let t5;
    	let label2;
    	let t7;
    	let input1;
    	let t8;
    	let button0;
    	let t10;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			form = element("form");
    			label0 = element("label");
    			label0.textContent = "Title:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			label1.textContent = "Description:";
    			t4 = space();
    			textarea = element("textarea");
    			t5 = space();
    			label2 = element("label");
    			label2.textContent = "Deadline:";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			button0 = element("button");
    			button0.textContent = "Create";
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			add_location(label0, file$3, 29, 4, 891);
    			set_style(input0, "border-color", /*titleColor*/ ctx[3]);
    			set_style(input0, "border-width", "2px");
    			attr_dev(input0, "class", "svelte-1l49uhy");
    			add_location(input0, file$3, 30, 4, 917);
    			add_location(label1, file$3, 32, 4, 1036);
    			set_style(textarea, "border-color", /*dColor*/ ctx[4]);
    			set_style(textarea, "border-width", "2px");
    			attr_dev(textarea, "class", "svelte-1l49uhy");
    			add_location(textarea, file$3, 33, 4, 1068);
    			add_location(label2, file$3, 35, 4, 1193);
    			attr_dev(input1, "type", "datetime-local");
    			attr_dev(input1, "class", "svelte-1l49uhy");
    			add_location(input1, file$3, 36, 4, 1222);
    			attr_dev(button0, "type", "submit");
    			attr_dev(button0, "class", "svelte-1l49uhy");
    			add_location(button0, file$3, 38, 4, 1283);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "svelte-1l49uhy");
    			add_location(button1, file$3, 39, 4, 1326);
    			attr_dev(form, "class", "svelte-1l49uhy");
    			add_location(form, file$3, 28, 2, 842);
    			attr_dev(div, "class", "svelte-1l49uhy");
    			add_location(div, file$3, 27, 0, 834);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, form);
    			append_dev(form, label0);
    			append_dev(form, t1);
    			append_dev(form, input0);
    			set_input_value(input0, /*titleInput*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, label1);
    			append_dev(form, t4);
    			append_dev(form, textarea);
    			set_input_value(textarea, /*dInput*/ ctx[2]);
    			append_dev(form, t5);
    			append_dev(form, label2);
    			append_dev(form, t7);
    			append_dev(form, input1);
    			set_input_value(input1, /*endDateInput*/ ctx[1]);
    			append_dev(form, t8);
    			append_dev(form, button0);
    			append_dev(form, t10);
    			append_dev(form, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input0, "input", /*fieldValidation*/ ctx[5], false, false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[9]),
    					listen_dev(textarea, "input", /*fieldValidation*/ ctx[5], false, false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(button1, "click", /*closeBox*/ ctx[6], false, false, false, false),
    					listen_dev(form, "submit", prevent_default(/*submitForm*/ ctx[7]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*titleColor*/ 8) {
    				set_style(input0, "border-color", /*titleColor*/ ctx[3]);
    			}

    			if (dirty & /*titleInput*/ 1 && input0.value !== /*titleInput*/ ctx[0]) {
    				set_input_value(input0, /*titleInput*/ ctx[0]);
    			}

    			if (dirty & /*dColor*/ 16) {
    				set_style(textarea, "border-color", /*dColor*/ ctx[4]);
    			}

    			if (dirty & /*dInput*/ 4) {
    				set_input_value(textarea, /*dInput*/ ctx[2]);
    			}

    			if (dirty & /*endDateInput*/ 2) {
    				set_input_value(input1, /*endDateInput*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CreateTaskItem', slots, []);
    	const today = new Date();
    	today.setHours(5, 0, 0, 0);
    	let { titleInput = '', endDateInput = today.toISOString().slice(0, 16), dInput = '' } = $$props;
    	let titleColor = '', dColor = '';
    	const dispatch = createEventDispatcher();

    	function fieldValidation() {
    		$$invalidate(3, titleColor = titleInput.trim().length > 10 ? 'lime' : 'red');
    		$$invalidate(4, dColor = dInput.trim().length > 10 ? 'lime' : 'red');
    	}

    	function closeBox() {
    		dispatch('closePopup', {});
    	}

    	function submitForm() {
    		if (titleInput.trim().length < 10 || dInput.trim().length < 20 || (endDateInput === undefined || endDateInput === null)) {
    			return;
    		}

    		let detail = {
    			title: titleInput.trim(),
    			description: dInput.trim(),
    			endDate: new Date(endDateInput)
    		};

    		dispatch('createItem', detail);
    	}

    	const writable_props = ['titleInput', 'endDateInput', 'dInput'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CreateTaskItem> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		titleInput = this.value;
    		$$invalidate(0, titleInput);
    	}

    	function textarea_input_handler() {
    		dInput = this.value;
    		$$invalidate(2, dInput);
    	}

    	function input1_input_handler() {
    		endDateInput = this.value;
    		$$invalidate(1, endDateInput);
    	}

    	$$self.$$set = $$props => {
    		if ('titleInput' in $$props) $$invalidate(0, titleInput = $$props.titleInput);
    		if ('endDateInput' in $$props) $$invalidate(1, endDateInput = $$props.endDateInput);
    		if ('dInput' in $$props) $$invalidate(2, dInput = $$props.dInput);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		today,
    		titleInput,
    		endDateInput,
    		dInput,
    		titleColor,
    		dColor,
    		dispatch,
    		fieldValidation,
    		closeBox,
    		submitForm
    	});

    	$$self.$inject_state = $$props => {
    		if ('titleInput' in $$props) $$invalidate(0, titleInput = $$props.titleInput);
    		if ('endDateInput' in $$props) $$invalidate(1, endDateInput = $$props.endDateInput);
    		if ('dInput' in $$props) $$invalidate(2, dInput = $$props.dInput);
    		if ('titleColor' in $$props) $$invalidate(3, titleColor = $$props.titleColor);
    		if ('dColor' in $$props) $$invalidate(4, dColor = $$props.dColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		titleInput,
    		endDateInput,
    		dInput,
    		titleColor,
    		dColor,
    		fieldValidation,
    		closeBox,
    		submitForm,
    		input0_input_handler,
    		textarea_input_handler,
    		input1_input_handler
    	];
    }

    class CreateTaskItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			titleInput: 0,
    			endDateInput: 1,
    			dInput: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateTaskItem",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get titleInput() {
    		throw new Error("<CreateTaskItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set titleInput(value) {
    		throw new Error("<CreateTaskItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get endDateInput() {
    		throw new Error("<CreateTaskItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set endDateInput(value) {
    		throw new Error("<CreateTaskItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dInput() {
    		throw new Error("<CreateTaskItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dInput(value) {
    		throw new Error("<CreateTaskItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    var byteToHex = [];
    for (var i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).slice(1));
    }
    function unsafeStringify(arr, offset = 0) {
      // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
      //
      // Note to future-self: No, you can't remove the `toLowerCase()` call.
      // REF: https://github.com/uuidjs/uuid/pull/677#issuecomment-1757351351
      return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).

    var getRandomValues;
    var rnds8 = new Uint8Array(16);
    function rng() {
      // lazy load so that environments that need to polyfill have a chance to do so
      if (!getRandomValues) {
        // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
        getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
        if (!getRandomValues) {
          throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
      }
      return getRandomValues(rnds8);
    }

    var randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
    var native = {
      randomUUID
    };

    function v4(options, buf, offset) {
      if (native.randomUUID && !buf && !options) {
        return native.randomUUID();
      }
      options = options || {};
      var rnds = options.random || (options.rng || rng)();

      // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80;

      // Copy bytes to buffer, if provided
      if (buf) {
        offset = offset || 0;
        for (var i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }
        return buf;
      }
      return unsafeStringify(rnds);
    }

    /* src/Components/TodoItem.svelte generated by Svelte v3.59.2 */
    const file$2 = "src/Components/TodoItem.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let h2;
    	let t0_value = /*task*/ ctx[0].title + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*task*/ ctx[0].description + "";
    	let t2;
    	let t3;
    	let span;

    	let t4_value = /*task*/ ctx[0].endDate.toLocaleString('en-in', {
    		day: 'numeric',
    		month: 'long',
    		year: 'numeric',
    		hour: '2-digit',
    		minute: '2-digit',
    		second: '2-digit'
    	}) + "";

    	let t4;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			span = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			button = element("button");
    			button.textContent = "X";
    			attr_dev(h2, "class", "svelte-18emv7r");
    			add_location(h2, file$2, 26, 2, 717);
    			add_location(p, file$2, 27, 2, 741);
    			set_style(span, "background-color", /*deadlineColor*/ ctx[2]());
    			attr_dev(span, "class", "svelte-18emv7r");
    			add_location(span, file$2, 28, 2, 769);
    			attr_dev(button, "class", "delete-btn svelte-18emv7r");
    			add_location(button, file$2, 34, 2, 994);
    			attr_dev(div, "class", "todo-item svelte-18emv7r");
    			add_location(div, file$2, 25, 0, 691);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(div, t3);
    			append_dev(div, span);
    			append_dev(span, t4);
    			append_dev(div, t5);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*task*/ 1 && t0_value !== (t0_value = /*task*/ ctx[0].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*task*/ 1 && t2_value !== (t2_value = /*task*/ ctx[0].description + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*task*/ 1 && t4_value !== (t4_value = /*task*/ ctx[0].endDate.toLocaleString('en-in', {
    				day: 'numeric',
    				month: 'long',
    				year: 'numeric',
    				hour: '2-digit',
    				minute: '2-digit',
    				second: '2-digit'
    			}) + "")) set_data_dev(t4, t4_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoItem', slots, []);

    	let { task = {
    		id: v4(),
    		title: 'Dummy Title',
    		description: 'Dummy Description',
    		endDate: new Date()
    	} } = $$props;

    	const dispatch = createEventDispatcher();

    	function deadlineColor() {
    		const deadline = new Date(task.endDate);
    		const now = new Date();
    		const diff = deadline - now;
    		const diffInMins = diff / (60 * 1000);
    		let colorList = ['#4CBB17', '#ffff00', ' #ec0c0c'];

    		if (diffInMins <= 24 * 60 && diffInMins > 0) {
    			return colorList[1];
    		} else if (diffInMins < 0) {
    			return colorList[2];
    		} else {
    			return colorList[0];
    		}
    	}

    	const writable_props = ['task'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch('deleteItem', { taskId: task.id });

    	$$self.$$set = $$props => {
    		if ('task' in $$props) $$invalidate(0, task = $$props.task);
    	};

    	$$self.$capture_state = () => ({
    		uuidv4: v4,
    		createEventDispatcher,
    		task,
    		dispatch,
    		deadlineColor
    	});

    	$$self.$inject_state = $$props => {
    		if ('task' in $$props) $$invalidate(0, task = $$props.task);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [task, dispatch, deadlineColor, click_handler];
    }

    class TodoItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { task: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoItem",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get task() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set task(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/TodoList.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$1 = "src/Components/TodoList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (39:4) {:else}
    function create_else_block(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "No Tasks Here... Add them";
    			add_location(h1, file$1, 39, 6, 958);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(39:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (35:4) {#if tasklist.length > 0}
    function create_if_block_1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*tasklist*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tasklist, deleteTaskItem*/ 5) {
    				each_value = /*tasklist*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(35:4) {#if tasklist.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (36:6) {#each tasklist as item}
    function create_each_block(ctx) {
    	let todoitem;
    	let current;

    	todoitem = new TodoItem({
    			props: { task: /*item*/ ctx[6] },
    			$$inline: true
    		});

    	todoitem.$on("deleteItem", /*deleteTaskItem*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(todoitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(todoitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const todoitem_changes = {};
    			if (dirty & /*tasklist*/ 1) todoitem_changes.task = /*item*/ ctx[6];
    			todoitem.$set(todoitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todoitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todoitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(todoitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(36:6) {#each tasklist as item}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {#if formPresent}
    function create_if_block(ctx) {
    	let createtaskitem;
    	let current;
    	createtaskitem = new CreateTaskItem({ $$inline: true });
    	createtaskitem.$on("closePopup", /*closePopup_handler*/ ctx[5]);
    	createtaskitem.$on("createItem", /*addItem*/ ctx[3]);

    	const block = {
    		c: function create() {
    			create_component(createtaskitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(createtaskitem, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(createtaskitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(createtaskitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(createtaskitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(43:2) {#if formPresent}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let button;
    	let t1;
    	let div0;
    	let current_block_type_index;
    	let if_block0;
    	let t2;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*tasklist*/ ctx[0].length > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*formPresent*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Add Task";
    			t1 = space();
    			div0 = element("div");
    			if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(button, "class", "svelte-138708v");
    			add_location(button, file$1, 32, 2, 712);
    			attr_dev(div0, "id", "todo-list");
    			attr_dev(div0, "class", "svelte-138708v");
    			add_location(div0, file$1, 33, 2, 779);
    			attr_dev(div1, "id", "container");
    			attr_dev(div1, "class", "svelte-138708v");
    			add_location(div1, file$1, 31, 0, 689);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(div1, t2);
    			if (if_block1) if_block1.m(div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				} else {
    					if_block0.p(ctx, dirty);
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(div0, null);
    			}

    			if (/*formPresent*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*formPresent*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoList', slots, []);

    	let { tasklist = [
    		{
    			id: v4(),
    			title: 'Dummy Title',
    			description: 'Dummy Description',
    			endDate: new Date()
    		}
    	] } = $$props;

    	let formPresent = false;

    	function deleteTaskItem(e) {
    		console.log(e);
    		const taskId = e.detail.taskId;
    		$$invalidate(0, tasklist = tasklist.filter(t => t.id !== taskId));
    		console.log('Deleted');
    	}

    	function addItem(e) {
    		console.log(e);
    		const task = e.detail;
    		task['id'] = v4();
    		$$invalidate(0, tasklist = [...tasklist, task]);
    		$$invalidate(1, formPresent = !formPresent);
    		console.log('Closing...');
    	}

    	const writable_props = ['tasklist'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<TodoList> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		$$invalidate(1, formPresent = true);
    	};

    	const closePopup_handler = () => {
    		$$invalidate(1, formPresent = !formPresent);
    	};

    	$$self.$$set = $$props => {
    		if ('tasklist' in $$props) $$invalidate(0, tasklist = $$props.tasklist);
    	};

    	$$self.$capture_state = () => ({
    		TodoItem,
    		CreateTaskItem,
    		uuidv4: v4,
    		tasklist,
    		formPresent,
    		deleteTaskItem,
    		addItem
    	});

    	$$self.$inject_state = $$props => {
    		if ('tasklist' in $$props) $$invalidate(0, tasklist = $$props.tasklist);
    		if ('formPresent' in $$props) $$invalidate(1, formPresent = $$props.formPresent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		tasklist,
    		formPresent,
    		deleteTaskItem,
    		addItem,
    		click_handler,
    		closePopup_handler
    	];
    }

    class TodoList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { tasklist: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoList",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get tasklist() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tasklist(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let todolist;
    	let current;
    	todolist = new TodoList({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(todolist.$$.fragment);
    			add_location(main, file, 6, 0, 193);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(todolist, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todolist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todolist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(todolist);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ CreateTaskItem, TodoItem, TodoList });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
