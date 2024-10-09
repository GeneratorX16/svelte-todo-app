<script>
  import TodoItem from "./TodoItem.svelte";
  import CreateTaskItem from "./CreateTaskItem.svelte";
  import { v4 as uuidv4 } from 'uuid';

  export let tasklist = [{id: uuidv4(), title: 'Dummy Title', description: 'Dummy Description', endDate: new Date()}];

  let formPresent = false;

  function deleteTaskItem(e) {
    console.log(e);
    const taskId = e.detail.taskId;
    tasklist = tasklist.filter(t => t.id !== taskId);
    console.log('Deleted');
  } 

  function addItem(e) {
    console.log(e);
    const task = e.detail;
    task['id'] = uuidv4();

    tasklist = [...tasklist, task];
    formPresent = !formPresent;
    console.log('Closing...');
  }


</script>



<div id="container">
  <button on:click={() => {formPresent = true;}}>Add Task</button>
  <div id="todo-list">
    {#if tasklist.length > 0}
      {#each tasklist as item}
        <TodoItem task = {item} on:deleteItem={deleteTaskItem}/>
      {/each}
    {:else}
      <h1>No Tasks Here... Add them</h1>
    {/if}
  </div>
  {#if formPresent}
    <CreateTaskItem on:closePopup={() => {formPresent = !formPresent;}} on:createItem={addItem} />
  {/if}
</div>


<style>
  #todo-list {
    display: flex;
    flex-direction: column;
    margin: 10px auto;
    align-self: center;
    max-width: 70vw;
  }

  #container {
    text-align: center;
  }

  button {
    border-radius: 20px;
    background-color: black;
    color: white;
    padding: 10px 10px;
    border: none;

  }

  button:hover {
    background-color: rgba(0, 0, 0, 0.8);
    cursor: pointer;
  }

  CreateTaskItem {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent backdrop */
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>