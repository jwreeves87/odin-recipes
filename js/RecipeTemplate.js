class RecipeTemplate {
  render(recipe) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  ${this.renderHead(recipe)}
</head>
<body>
  <div class="container">
    ${this.renderBackButton()}
    ${this.renderHeader(recipe)}
    ${this.renderEditDeleteButtons(recipe)}
    ${this.renderSourceInfo(recipe)}
    ${this.renderAboutSection(recipe)}
    ${this.renderMainContent(recipe)}
  </div>
  ${this.renderScripts(recipe)}
</body>
</html>`;
  }

  renderHead(recipe) {
    return `<meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(recipe.title)} - Reeves BBQ Co.</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/cdn/themes/light.css" />
  <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/cdn/shoelace-autoloader.js"></script>
  ${this.renderStyles()}`;
  }

  renderStyles() {
    return `<style>
    body {
      margin: 0;
      padding: 0;
      font-family: var(--sl-font-sans);
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      color: #212529;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }
    .recipe-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .recipe-image {
      width: 100%;
      max-width: 500px;
      height: 300px;
      object-fit: cover;
      border-radius: var(--sl-border-radius-large);
      box-shadow: var(--sl-shadow-large);
    }
    .recipe-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
      margin-top: 2rem;
    }
    @media (min-width: 768px) {
      .recipe-grid {
        grid-template-columns: 1fr 1fr 1fr;
      }
    }
    .back-button {
      margin-bottom: 2rem;
    }
    .source-info {
      background: rgba(255, 107, 53, 0.1);
      border: 1px solid rgba(255, 107, 53, 0.3);
      border-radius: var(--sl-border-radius-medium);
      padding: 1rem;
      margin-bottom: 2rem;
    }
  </style>`;
  }

  renderBackButton() {
    return `<div class="back-button">
      <sl-button variant="text" href="../index.html">
        <sl-icon slot="prefix" name="arrow-left"></sl-icon>
        Back to Championship Collection
      </sl-button>
    </div>`;
  }

  renderHeader(recipe) {
    const imageHtml = recipe.hasImage() 
      ? `<img src="${this.escapeHtml(recipe.image)}" alt="${this.escapeHtml(recipe.title)}" class="recipe-image">`
      : '';

    return `<div class="recipe-header">
      <h1 style="color: var(--sl-color-neutral-800); margin-bottom: 1rem;">
        <sl-icon name="fire" style="color: #ff6b35;"></sl-icon>
        ${this.escapeHtml(recipe.title)}
      </h1>
      ${imageHtml}
    </div>`;
  }

  renderSourceInfo(recipe) {
    if (!recipe.hasSource()) return '';

    const authorText = recipe.author ? ` by ${this.escapeHtml(recipe.author)}` : '';
    
    return `<div class="source-info">
      <sl-alert variant="primary" open>
        <sl-icon slot="icon" name="link"></sl-icon>
        <strong>Recipe Source:</strong> Imported from <strong>${this.escapeHtml(recipe.getSourceDomain())}</strong>${authorText}
        <sl-button slot="footer" variant="text" href="${this.escapeHtml(recipe.sourceUrl)}" target="_blank">
          <sl-icon slot="prefix" name="arrow-up-right-from-square"></sl-icon>
          View Original Recipe
        </sl-button>
      </sl-alert>
    </div>`;
  }

  renderAboutSection(recipe) {
    if (!recipe.hasDescription()) return '';

    return `<sl-card style="margin-bottom: 2rem;">
      <sl-icon slot="prefix" name="info-circle"></sl-icon>
      <h3 slot="header">About This Recipe</h3>
      <p>${this.escapeHtml(recipe.description)}</p>
    </sl-card>`;
  }

  renderMainContent(recipe) {
    return `<div class="recipe-grid">
      ${this.renderDetailsCard(recipe)}
      ${this.renderIngredientsCard(recipe)}
      ${this.renderInstructionsCard(recipe)}
    </div>`;
  }

  renderDetailsCard(recipe) {
    if (!recipe.hasTiming()) return '';

    const details = [];
    if (recipe.prepTime) details.push(`<li><sl-badge variant="neutral">Prep:</sl-badge> ${this.escapeHtml(recipe.prepTime)}</li>`);
    if (recipe.cookTime) details.push(`<li><sl-badge variant="warning">Cook:</sl-badge> ${this.escapeHtml(recipe.cookTime)}</li>`);
    if (recipe.servings) details.push(`<li><sl-badge variant="success">Serves:</sl-badge> ${this.escapeHtml(recipe.servings)}</li>`);

    return `<sl-card>
      <sl-icon slot="prefix" name="clock"></sl-icon>
      <h3 slot="header">Recipe Details</h3>
      <sl-details summary="Cooking Information">
        <ul style="list-style: none; padding: 0;">
          ${details.join('\n          ')}
        </ul>
      </sl-details>
    </sl-card>`;
  }

  renderIngredientsCard(recipe) {
    if (!recipe.hasIngredients()) {
      return `<sl-card>
        <sl-icon slot="prefix" name="basket"></sl-icon>
        <h3 slot="header">Ingredients</h3>
        <p><em>No ingredients found.</em></p>
      </sl-card>`;
    }

    const ingredientsList = recipe.ingredients
      .map(ingredient => `<li>${this.escapeHtml(ingredient)}</li>`)
      .join('\n          ');

    return `<sl-card>
      <sl-icon slot="prefix" name="basket"></sl-icon>
      <h3 slot="header">Ingredients</h3>
      <sl-details summary="Shopping List">
        <ul>
          ${ingredientsList}
        </ul>
      </sl-details>
    </sl-card>`;
  }

  renderInstructionsCard(recipe) {
    if (!recipe.hasInstructions()) {
      return `<sl-card>
        <sl-icon slot="prefix" name="list-check"></sl-icon>
        <h3 slot="header">Instructions</h3>
        <p><em>No instructions found.</em></p>
      </sl-card>`;
    }

    const instructionsList = recipe.instructions
      .map(instruction => `<li>${this.escapeHtml(instruction)}</li>`)
      .join('\n          ');

    return `<sl-card>
      <sl-icon slot="prefix" name="list-check"></sl-icon>
      <h3 slot="header">Instructions</h3>
      <sl-details summary="Cooking Steps">
        <ol>
          ${instructionsList}
        </ol>
      </sl-details>
    </sl-card>`;
  }

  renderEditDeleteButtons(recipe) {
    // Only show edit/delete buttons for recipes with metadata (i.e., managed recipes)
    if (!recipe.hasMetadata || !recipe.hasMetadata()) {
      return '';
    }

    return `<div class="recipe-actions" style="text-align: center; margin-bottom: 2rem;">
      <sl-button-group>
        <sl-button variant="neutral" id="edit-recipe-btn">
          <sl-icon slot="prefix" name="edit"></sl-icon>
          Edit Recipe
        </sl-button>
        <sl-button variant="danger" id="delete-recipe-btn">
          <sl-icon slot="prefix" name="trash"></sl-icon>
          Delete Recipe
        </sl-button>
      </sl-button-group>
    </div>`;
  }

  renderScripts(recipe) {
    // Only include scripts for recipes with metadata
    if (!recipe.hasMetadata || !recipe.hasMetadata()) {
      return '';
    }

    return `<script>
      document.addEventListener('DOMContentLoaded', function() {
        const editBtn = document.getElementById('edit-recipe-btn');
        const deleteBtn = document.getElementById('delete-recipe-btn');
        const recipeId = '${this.escapeHtml(recipe.id || '')}';
        
        if (editBtn) {
          editBtn.addEventListener('click', function() {
            window.location.href = '/edit-recipe.html?id=' + recipeId;
          });
        }
        
        if (deleteBtn) {
          deleteBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
              deleteRecipe(recipeId);
            }
          });
        }
      });
      
      async function deleteRecipe(recipeId) {
        try {
          // Show loading state
          const deleteBtn = document.getElementById('delete-recipe-btn');
          const originalContent = deleteBtn.innerHTML;
          deleteBtn.innerHTML = '<sl-icon name="hourglass"></sl-icon> Deleting...';
          deleteBtn.disabled = true;
          
          const response = await fetch('/api/recipes/' + recipeId, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Show success message briefly before redirect
            deleteBtn.innerHTML = '<sl-icon name="check-circle"></sl-icon> Deleted!';
            setTimeout(() => {
              window.location.href = '/index.html';
            }, 1000);
          } else {
            alert('Failed to delete recipe: ' + (data.error || 'Unknown error'));
            deleteBtn.innerHTML = originalContent;
            deleteBtn.disabled = false;
          }
        } catch (error) {
          alert('Network error: ' + error.message);
          const deleteBtn = document.getElementById('delete-recipe-btn');
          deleteBtn.innerHTML = originalContent;
          deleteBtn.disabled = false;
        }
      }
    </script>`;
  }

  escapeHtml(text) {
    if (!text) return '';
    
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Make available for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecipeTemplate;
} else if (typeof window !== 'undefined') {
  window.RecipeTemplate = RecipeTemplate;
}