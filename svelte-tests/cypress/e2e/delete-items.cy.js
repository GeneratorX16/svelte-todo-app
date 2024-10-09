describe("Deleting items", () => {

  beforeEach(() => {
    cy.visit("/");
  })

  it('Add task and check delete', () => {
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

    // Make assertions and delete item

    cy.contains(title).parents('.todo-item').within(() => {
      cy.contains(title).should('be.visible');
      cy.contains(description).should('be.visible');
      cy.get('span').should('have.css', 'background-color', 'rgb(76, 187, 23)')
      cy.get('button').click();
    })

    // Make assertions
    cy.contains(title).should('not.exist');
    cy.contains(description).should('not.exist');


  });
})