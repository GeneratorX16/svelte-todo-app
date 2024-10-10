<script>
  import { createEventDispatcher } from "svelte";
  const today = new Date();
  today.setHours(5, 0, 0, 0);
  export let titleInput='', endDateInput= today.toISOString().slice(0, 16), dInput='';
  let titleColor = '', dColor = '';
  const dispatch = createEventDispatcher();

  function fieldValidation() {
    titleColor = titleInput.trim().length > 10 ? 'lime' : 'red';
    dColor = dInput.trim().length > 10 ? 'lime': 'red';

  }

  function closeBox() {
    dispatch('closePopup', {});
  }

  function submitForm(){
    if (titleInput.trim().length < 10 || dInput.trim().length < 20 || (endDateInput === undefined || endDateInput === null) ) {
      return 
    }
    let detail = {title: titleInput.trim(), description: dInput.trim(), endDate: new Date(endDateInput)};
    dispatch('createItem', detail);
  }
</script>

<div>
  <form on:submit|preventDefault={submitForm}>
    <label for="title-input">Title:</label>
    <input name = "title-input" bind:value={titleInput} style="border-color: {titleColor}; border-width: 2px;" on:input={fieldValidation}>

    <label for="description-input">Description:</label>
    <textarea name = "description-input" bind:value={dInput} style="border-color: {dColor}; border-width: 2px;" on:input={fieldValidation}></textarea>

    <label for="titdeadlinele-input">Deadline:</label>
    <input name = "deadline-input" type="datetime-local" bind:value={endDateInput}>

    <button type="submit">Create</button> 
    <button type="button" on:click={closeBox}>Cancel</button>
  </form>
</div>

<style>

  button {
    width: 20%;
    margin: 10px auto;
    border: none;
    background-color: cadetblue;
    color: white;
    border-radius: 10px;
  }

  form {
    display: flex;
    flex-direction: column;
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 40vw;
  }

  div {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent backdrop */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999; /* Ensures the overlay is on top */
  }

  textarea {
    resize: none;
    height: 20vh;
    border-radius: 10px;
    margin-top: 10px;
  }

  input {
    border-radius: 10px;
    margin-top: 5px;
    margin-bottom: 5px;
  }

  input:focus {
    outline: none;
  }
</style>