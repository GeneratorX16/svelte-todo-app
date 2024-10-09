<script>
  import { v4 as uuidv4 } from 'uuid';
  import { createEventDispatcher } from "svelte";
  export let task = {id: uuidv4(), title: 'Dummy Title', description: 'Dummy Description', endDate: new Date()};

  const dispatch = createEventDispatcher();

  function deadlineColor() {
    const deadline = new Date(task.endDate);
    const now = new Date();
    const diff = deadline - now;
    const diffInMins = diff / (60*1000);
    let colorList = ['#4CBB17', '#ffff00', ' #ec0c0c']

    
    if (diffInMins <= 24*60 && diffInMins > 0) {
      return colorList[1];
    } else if (diffInMins < 0) {
      return colorList[2];
    } else {
      return colorList[0];
    }
  }
</script>

<div class="todo-item">
  <h2>{task.title}</h2>
  <p>{task.description}</p>
  <span style="background-color: {deadlineColor()}">{task.endDate.toLocaleString('en-in', {  day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'})}</span>
  <button class="delete-btn" on:click={() => dispatch('deleteItem', {taskId: task.id})}>X</button>
</div>

<style>
  div {
    padding: 10px 10px;
    border: 1px solid black;
    box-shadow: 1px 2px 3px rgba(100, 100, 100, 0.9);
    border-radius: 10px;
    position: relative;
    margin: 20px;
  }

  h2 {
    margin: 2px;
  }

  button {
  background-color: red;
  color: white;
  border-radius: 50%;
  padding: 8px 8px; /* Reduced padding */
  width: 40px; /* Smaller width */
  height: 40px; /* Smaller height */
  position: absolute;
  top: -10px;
  right: -15px;
  }

  button:hover {
    background-color: rgba(255, 100, 100, 1);
    cursor: pointer;
  }

  span {
    background-color: black;
    color: white;
    padding: 5px 5px;
    border-radius: 10px;
  }
</style>