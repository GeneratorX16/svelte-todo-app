# my-svelte-project



## Project Description
This is a simple Todo Web App built using Svelte. It includes the application code and integration tests to test the application whenever any changes have been pushed to the master branch. It is made for Gitlab, as it also includes the gitlab-ci.yml file to run the tests when running the application. 

There is no deployment stage, only a single test stage where all the test would be run locally wherever the application is hosted and the tests would run in the same machine too.

## Application Description
<ul>
  <li>A new task can be added, or an existing task can be deleted.</li>
  <li>Task count is updated as tasks are added or deleted.</li>
  <li>If deadline to task is within 24 hours, it is shown in yellow.</li>
  <li>If deadline to task is more than 24 hours, it is shwon in green.</li>
  <li>If deadline to task has passed, it is shown in red.</li>
</ul>

## Integration Tests using Cypress

I have used cypress for running integration tests on the web app. It consists of tests to verify the following:
<ol>
  <li>Tasks that are added are shown in the task list.</li>
  <li>Tasks that are deleted are not shown in the list.</li>
  <li>Task counter should be updated.</li>
</ol>
