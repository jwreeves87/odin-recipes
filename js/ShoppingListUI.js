class ShoppingListUI {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  // Get recipe ID from current page URL or metadata
  getCurrentRecipeId() {
    // Try to get from meta tag first
    const metaTag = document.querySelector('meta[name="recipe-id"]');
    if (metaTag) {
      const recipeId = metaTag.getAttribute('content');
      console.log('Found recipe ID from meta tag:', recipeId);
      return recipeId;
    }

    // Try to extract from page metadata comments
    const html = document.documentElement.outerHTML;
    const match = html.match(/RECIPE_METADATA_START[^{]*({[^}]+})/);
    if (match) {
      try {
        const metadata = JSON.parse(match[1]);
        console.log('Found recipe ID from metadata:', metadata.id);
        return metadata.id;
      } catch (e) {
        console.warn('Failed to parse recipe metadata:', e);
      }
    }

    // Fallback: try to extract from URL
    const pathParts = window.location.pathname.split('/');
    const htmlFile = pathParts[pathParts.length - 1];
    const recipeId = htmlFile.replace('.html', '');
    console.log('Using recipe ID from filename:', recipeId);
    return recipeId;
  }

  // Generate shopping list from single recipe
  async generateSingleRecipeList(recipeId, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/shopping-lists/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipeId,
          ...options
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate shopping list');
      }

      return data.shoppingList;
    } catch (error) {
      console.error('Error generating shopping list:', error);
      throw error;
    }
  }

  // Generate shopping list from multiple recipes
  async generateMultipleRecipesList(recipeIds, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/shopping-lists/multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipeIds,
          ...options
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate shopping list');
      }

      return { shoppingList: data.shoppingList, warnings: data.warnings || [] };
    } catch (error) {
      console.error('Error generating multi-recipe shopping list:', error);
      throw error;
    }
  }

  // Generate Reminders app URL
  async generateRemindersUrl(shoppingList, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/shopping-lists/reminders-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shoppingList,
          ...options
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate Reminders URL');
      }

      return data;
    } catch (error) {
      console.error('Error generating Reminders URL:', error);
      throw error;
    }
  }

  // Direct export to Reminders (opens URL)
  async exportToReminders(recipeId, options = {}) {
    try {
      const url = `${this.baseUrl}/api/shopping-lists/export/${recipeId}?` + 
        new URLSearchParams({
          format: 'reminders',
          ...options
        });
      
      // Open the URL - this will redirect to Reminders app
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error exporting to Reminders:', error);
      throw error;
    }
  }

  // Show shopping list in modal
  showShoppingListModal(shoppingList, options = {}) {
    const modal = document.createElement('sl-dialog');
    modal.label = options.title || shoppingList.title || 'Shopping List';
    modal.setAttribute('class', 'shopping-list-modal');

    const organized = options.organizeByCategory && shoppingList.organized;

    let itemsHtml = '';
    if (organized) {
      // Show organized by category
      Object.entries(shoppingList.organized).forEach(([category, items]) => {
        itemsHtml += `
          <div class="category-section">
            <h4 style="color: #ff6b35; text-transform: uppercase; margin: 1rem 0 0.5rem 0; font-size: 0.9rem;">
              ${category}
            </h4>
            <ul style="margin: 0 0 1rem 0; padding-left: 1.5rem;">
              ${items.map(item => `
                <li style="margin-bottom: 0.25rem;">
                  ${this.formatItemQuantity(item)} ${item.item}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      });
    } else {
      // Show as simple list
      itemsHtml = `
        <ul style="margin: 0; padding-left: 1.5rem;">
          ${shoppingList.items.map(item => `
            <li style="margin-bottom: 0.5rem;">
              ${this.formatItemQuantity(item)} ${item.item}
            </li>
          `).join('')}
        </ul>
      `;
    }

    modal.innerHTML = `
      <div style="max-height: 400px; overflow-y: auto;">
        <div style="margin-bottom: 1rem;">
          <sl-badge variant="primary">${shoppingList.itemCount} items</sl-badge>
          ${shoppingList.recipes ? `<sl-badge variant="neutral">${shoppingList.recipes.length} recipes</sl-badge>` : ''}
        </div>
        ${itemsHtml}
      </div>
      <div slot="footer">
        <sl-button-group>
          <sl-button variant="default" id="close-modal">Close</sl-button>
          <sl-button variant="primary" id="export-reminders">
            <sl-icon slot="prefix" name="phone"></sl-icon>
            Export to Reminders
          </sl-button>
          <sl-button variant="neutral" id="copy-list">
            <sl-icon slot="prefix" name="copy"></sl-icon>
            Copy List
          </sl-button>
        </sl-button-group>
      </div>
    `;

    // Add event listeners
    modal.querySelector('#close-modal').addEventListener('click', () => {
      modal.open = false;
    });

    modal.querySelector('#export-reminders').addEventListener('click', async () => {
      try {
        const urlData = await this.generateRemindersUrl(shoppingList, { organizeByCategory: organized });
        
        if (urlData.shortcutRequired) {
          // Show information about the shortcut requirement
          const confirmed = confirm(
            `This feature requires a Shortcuts app shortcut named "${urlData.shortcutName}".\n\n` +
            `Would you like to proceed? If the shortcut doesn't exist, you'll need to create it first.\n\n` +
            `Click OK to continue or Cancel to try the fallback method.`
          );
          
          if (confirmed) {
            window.open(urlData.url, '_blank');
            this.showToast('Opening Shortcuts app...', 'primary');
          } else {
            // Try fallback URL
            window.open(urlData.fallbackUrl, '_blank');
            this.showToast('Using fallback method - may just open Reminders app', 'warning');
          }
        } else {
          window.open(urlData.url, '_blank');
          this.showToast('Shopping list exported to Reminders!', 'success');
        }
        
        modal.open = false;
      } catch (error) {
        this.showToast('Failed to export to Reminders: ' + error.message, 'danger');
      }
    });

    modal.querySelector('#copy-list').addEventListener('click', () => {
      const listText = this.formatShoppingListText(shoppingList, { organizeByCategory: organized });
      navigator.clipboard.writeText(listText).then(() => {
        this.showToast('Shopping list copied to clipboard!', 'success');
      }).catch(() => {
        this.showToast('Failed to copy shopping list', 'danger');
      });
    });

    // Add to DOM and show
    document.body.appendChild(modal);
    
    // Wait for component to be ready, then show
    requestAnimationFrame(() => {
      modal.open = true;
    });

    // Remove from DOM when hidden
    modal.addEventListener('sl-after-hide', () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    });
  }

  // Format item quantity for display
  formatItemQuantity(item) {
    if (item.quantity === null || item.quantity === undefined) {
      return '';
    }
    
    const quantity = this.formatFraction(item.quantity);
    const unit = item.unit ? ` ${item.unit}` : '';
    return `${quantity}${unit}`;
  }

  // Format decimal quantities as fractions where appropriate
  formatFraction(decimal) {
    if (decimal === parseInt(decimal)) {
      return decimal.toString();
    }

    // Common fractions
    const fractions = {
      0.25: '1/4',
      0.5: '1/2',
      0.75: '3/4',
      0.33: '1/3',
      0.67: '2/3'
    };

    const roundedDecimal = Math.round(decimal * 100) / 100;
    const wholePart = Math.floor(roundedDecimal);
    const decimalPart = roundedDecimal - wholePart;

    if (fractions[decimalPart]) {
      return wholePart > 0 ? `${wholePart} ${fractions[decimalPart]}` : fractions[decimalPart];
    }

    return decimal.toString();
  }

  // Format shopping list as plain text
  formatShoppingListText(shoppingList, options = {}) {
    let text = `${shoppingList.title}\n\n`;

    if (options.organizeByCategory && shoppingList.organized) {
      Object.entries(shoppingList.organized).forEach(([category, items]) => {
        text += `${category.toUpperCase()}:\n`;
        items.forEach(item => {
          text += `• ${this.formatItemQuantity(item)} ${item.item}\n`;
        });
        text += '\n';
      });
    } else {
      shoppingList.items.forEach(item => {
        text += `• ${this.formatItemQuantity(item)} ${item.item}\n`;
      });
    }

    return text;
  }

  // Show options modal for shopping list generation
  showOptionsModal(callback) {
    const modal = document.createElement('sl-dialog');
    modal.label = 'Shopping List Options';
    modal.setAttribute('class', 'shopping-list-options-modal');

    modal.innerHTML = `
      <form id="shopping-list-options-form">
        <div style="margin-bottom: 1rem;">
          <sl-input id="list-name" label="List Name" placeholder="My Shopping List" clearable>
            <sl-icon slot="prefix" name="list"></sl-icon>
          </sl-input>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <sl-input id="scale-multiplier" label="Scale Recipe" type="number" min="0.1" max="10" step="0.1" value="1" clearable>
            <sl-icon slot="prefix" name="calculator"></sl-icon>
            <small slot="help-text">Multiply quantities by this amount (e.g., 2 for double recipe)</small>
          </sl-input>
        </div>

        <div style="margin-bottom: 1rem;">
          <sl-checkbox id="organize-by-category" checked>Organize by Category</sl-checkbox>
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="font-weight: 500; margin-bottom: 0.5rem; display: block;">Filter Categories:</label>
          <div id="category-filter" style="display: flex; flex-wrap: wrap; gap: 1rem;">
            <sl-checkbox value="meat">Meat & Seafood</sl-checkbox>
            <sl-checkbox value="vegetables">Vegetables</sl-checkbox>
            <sl-checkbox value="pantry">Pantry Items</sl-checkbox>
            <sl-checkbox value="spices">Spices & Seasonings</sl-checkbox>
            <sl-checkbox value="dairy">Dairy</sl-checkbox>
          </div>
          <small style="color: var(--sl-color-neutral-500);">Leave all unchecked to include all categories</small>
        </div>
      </form>

      <div slot="footer">
        <sl-button-group>
          <sl-button variant="default" id="cancel-options">Cancel</sl-button>
          <sl-button variant="primary" id="generate-list" type="submit">
            <sl-icon slot="prefix" name="list-check"></sl-icon>
            Generate Shopping List
          </sl-button>
        </sl-button-group>
      </div>
    `;

    // Add event listeners
    modal.querySelector('#cancel-options').addEventListener('click', () => {
      modal.open = false;
    });

    modal.querySelector('#generate-list').addEventListener('click', (e) => {
      e.preventDefault();
      
      const options = {};
      
      // Get list name
      const listName = modal.querySelector('#list-name').value.trim();
      if (listName) options.listName = listName;
      
      // Get scale multiplier
      const scale = parseFloat(modal.querySelector('#scale-multiplier').value);
      if (scale && scale !== 1) options.scaleMultiplier = scale;
      
      // Get organize by category preference
      const organizeByCategory = modal.querySelector('#organize-by-category').checked;
      
      // Get category filter
      const categoryCheckboxes = modal.querySelectorAll('#category-filter sl-checkbox');
      const selectedCategories = Array.from(categoryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      
      if (selectedCategories.length > 0 && selectedCategories.length < categoryCheckboxes.length) {
        options.categoryFilter = selectedCategories;
      }
      
      modal.open = false;
      callback(options, organizeByCategory);
    });

    // Add to DOM and show
    document.body.appendChild(modal);
    
    // Wait for component to be ready, then show
    requestAnimationFrame(() => {
      modal.open = true;
    });

    // Remove from DOM when hidden
    modal.addEventListener('sl-after-hide', () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    });
  }

  // Show toast notification
  showToast(message, variant = 'primary') {
    const toast = document.createElement('sl-alert');
    toast.variant = variant;
    toast.closable = true;
    toast.open = true;
    
    toast.innerHTML = `
      <sl-icon slot="icon" name="${variant === 'success' ? 'check-circle' : variant === 'danger' ? 'exclamation-triangle' : 'info-circle'}"></sl-icon>
      ${message}
    `;

    // Position toast at top right
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '10000';
    toast.style.maxWidth = '400px';

    document.body.appendChild(toast);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.open = false;
    }, 3000);

    // Remove from DOM after hiding
    toast.addEventListener('sl-after-hide', () => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
  }

  // Initialize shopping list functionality on current page
  initializeForRecipe() {
    const recipeId = this.getCurrentRecipeId();
    if (!recipeId) {
      console.warn('Could not determine recipe ID for shopping list functionality');
      return;
    }

    // Add shopping list export button if it doesn't exist
    this.addShoppingListButton(recipeId);
  }

  // Add shopping list button to recipe page
  addShoppingListButton(recipeId) {
    const actionsContainer = document.querySelector('.recipe-actions sl-button-group');
    if (!actionsContainer) return;

    // Check if button already exists
    if (actionsContainer.querySelector('#shopping-list-btn')) return;

    const button = document.createElement('sl-button');
    button.id = 'shopping-list-btn';
    button.variant = 'success';
    button.innerHTML = `
      <sl-icon slot="prefix" name="basket"></sl-icon>
      Shopping List
    `;

    button.addEventListener('click', () => {
      this.showOptionsModal(async (options, organizeByCategory) => {
        try {
          this.showToast('Generating shopping list...', 'primary');
          const shoppingList = await this.generateSingleRecipeList(recipeId, options);
          this.showShoppingListModal(shoppingList, { organizeByCategory });
        } catch (error) {
          this.showToast('Failed to generate shopping list: ' + error.message, 'danger');
        }
      });
    });

    actionsContainer.appendChild(button);
  }
}

// Auto-initialize on recipe pages
document.addEventListener('DOMContentLoaded', () => {
  const shoppingListUI = new ShoppingListUI();
  
  // Initialize on individual recipe pages
  if (document.querySelector('.recipe-actions')) {
    shoppingListUI.initializeForRecipe();
  }
  
  // Make available globally for other components
  window.ShoppingListUI = shoppingListUI;
});