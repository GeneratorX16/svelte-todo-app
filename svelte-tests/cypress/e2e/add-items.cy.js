describe('template spec', () => {

  beforeEach(() => {
    cy.visit("/");
  })

  it('Add task with deadline being 2 days ahead', () => {
    const randomNumber = Number.parseInt(Math.random()*1000)
    const title = `This is a test task ${randomNumber}`;
    const description = `This is a test description of the item ${randomNumber}`;
    const today = new Date();
    today.setDate(today.getDate() + 2);

    
    cy.contains('button', 'Add Task').click();

    cy.get('input').first().type(title);
    cy.get('textarea').type(description)
    cy.get('input[type="datetime-local"]').type(today.toISOString().slice(0, 16));

    cy.get('form').submit();

    // Make assertions

    cy.contains(title).parents('.todo-item').within(() => {
      cy.contains(title).should('be.visible');
      cy.contains(description).should('be.visible');
      cy.get('span').should('have.css', 'background-color', 'rgb(76, 187, 23)');
      cy.contains(formatDate(today)).should('be.visible');
    })
  });

  it('Add task with deadline being within 24 hours', () => {
    const randomNumber = Number.parseInt(Math.random()*1000)
    const title = `This is a test task ${randomNumber}`;
    const description = `This is a test description of the item ${randomNumber}`;
    const today = new Date();
    today.setHours(today.getHours() + 10);

    
    cy.contains('button', 'Add Task').click();

    cy.get('input').first().type(title);
    cy.get('textarea').type(description)
    cy.get('input[type="datetime-local"]').type(today.toISOString().slice(0, 16));

    cy.get('form').submit();

    // Make assertions

    cy.contains(title).parents('.todo-item').within(() => {
      cy.contains(title).should('be.visible');
      cy.contains(description).should('be.visible');
      cy.get('span').should('have.css', 'background-color', 'rgb(255, 255, 0)');
      cy.contains(formatDate(today)).should('be.visible');
    })

  });

  it('Add task with deadline being already behind', () => {
    const randomNumber = Number.parseInt(Math.random()*1000)
    const title = `This is a test task ${randomNumber}`;
    const description = `This is a test description of the item ${randomNumber}`;
    const today = new Date();
    today.setDate(today.getDate() - 2);

    
    cy.contains('button', 'Add Task').click();

    cy.get('input').first().type(title);
    cy.get('textarea').type(description)
    cy.get('input[type="datetime-local"]').type(today.toISOString().slice(0, 16));

    cy.get('form').submit();

    // Make assertions

    cy.contains(title).parents('.todo-item').within(() => {
      cy.contains(title).should('be.visible');
      cy.contains(description).should('be.visible');
      cy.get('span').should('have.css', 'background-color', 'rgb(236, 12, 12)');
      cy.contains(formatDate(today)).should('be.visible');
    })
  });

})


function formatDate(date) {
  date.setHours(date.getHours() - 5);
  date.setMinutes(date.getMinutes() - 30);

  const day = date.getDate(); // Day of the month
  const month = date.toLocaleString('en-GB', { month: 'long' }); // Full month name
  const year = date.getFullYear(); // Year
  let hours = date.getHours().toString().padStart(2, '0');
  cy.log(hours);
  const minutes = date.getMinutes().toString().padStart(2, '0'); // Minutes, padded
  const seconds = '00'; // You can set seconds manually or get it from `date.getSeconds()`
  
  // Determine if it's AM or PM
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12; // Convert 24-hour format to 12-hour format, handle midnight
  
  // Format the date string
  const formattedDate = `${day} ${month} ${year} at ${hours <= 9 ? '0' + hours: hours}:${minutes}:${seconds} ${ampm}`;
  
  return formattedDate;
}