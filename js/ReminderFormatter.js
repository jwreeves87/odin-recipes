class ReminderFormatter {
  constructor() {
    this.urlScheme = 'shortcuts://run-shortcut';
    this.shortcutName = 'Add Shopping List to Reminders';
    this.commonFractions = {
      0.25: '1/4',
      0.33: '1/3',
      0.5: '1/2',
      0.67: '2/3',
      0.75: '3/4'
    };
  }

  formatForReminders(shoppingList, options = {}) {
    // Validate shopping list
    const validation = this.validateShoppingList(shoppingList);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    try {
      let reminderText = '';
      let itemCount = 0;

      if (options.organizeByCategory && shoppingList.organized) {
        // Format organized by category
        const categories = Object.keys(shoppingList.organized);
        
        categories.forEach((category, index) => {
          if (index > 0) reminderText += '\n';
          
          reminderText += `${category.toUpperCase()}:\n`;
          
          shoppingList.organized[category].forEach(item => {
            reminderText += `${this.formatItemText(item)}\n`;
            itemCount++;
          });
        });
      } else {
        // Format as simple list
        shoppingList.items.forEach(item => {
          reminderText += `${this.formatItemText(item)}\n`;
          itemCount++;
        });
      }

      return {
        success: true,
        reminderText: reminderText.trim(),
        listName: shoppingList.title,
        itemCount
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to format for Reminders: ${error.message}`
      };
    }
  }

  generateReminderUrl(shoppingList, options = {}) {
    // Validate shopping list
    const validation = this.validateShoppingList(shoppingList);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    if (!shoppingList.items || shoppingList.items.length === 0) {
      return { success: false, error: 'Shopping list is empty' };
    }

    try {
      // Format the shopping list data as JSON for the shortcut
      const listName = options.listName || shoppingList.title;
      const items = options.organizeByCategory && shoppingList.organized ? 
        this.flattenOrganizedItems(shoppingList.organized) : 
        shoppingList.items;

      // Create simple text list for the shortcut
      const itemTexts = items.map(item => this.formatItemText(item));
      const simpleText = `${listName}\n\n${itemTexts.join('\n')}`;

      // Encode the simple text as input for the shortcut
      const encodedData = encodeURIComponent(simpleText);
      const encodedShortcutName = encodeURIComponent(this.shortcutName);
      
      // Create the shortcuts URL with fallback to simple reminders scheme
      const shortcutsUrl = `${this.urlScheme}?name=${encodedShortcutName}&input=${encodedData}`;
      
      // Also provide a fallback URL that uses the simpler reminders scheme
      const formatResult = this.formatForReminders(shoppingList, options);
      const fallbackUrl = `x-apple-reminderkit://REMSaveRequest?reminderText=${encodeURIComponent(formatResult.reminderText)}&listName=${encodeURIComponent(listName)}`;

      return {
        success: true,
        url: shortcutsUrl,
        fallbackUrl: fallbackUrl,
        listName,
        itemCount: items.length,
        shortcutRequired: true,
        shortcutName: this.shortcutName,
        platform: options.platform || 'ios'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate URL: ${error.message}`
      };
    }
  }

  formatItemText(item) {
    if (!item) {
      return '';
    }

    let formatted = '';

    // Handle quantity
    if (item.quantity !== null && item.quantity !== undefined) {
      // Convert decimal to fraction if appropriate
      const quantityStr = this.formatAsFraction(item.quantity);
      formatted += quantityStr;

      // Add unit if present
      if (item.unit) {
        formatted += ` ${item.unit}`;
      }

      formatted += ' ';
    }

    // Add item name
    formatted += item.item || 'Unknown item';

    return formatted;
  }

  formatAsFraction(decimal) {
    if (decimal === null || decimal === undefined) {
      return '';
    }

    // Handle whole numbers
    if (decimal % 1 === 0) {
      return decimal.toString();
    }

    // Check for common fractions
    const rounded = Math.round(decimal * 100) / 100; // Round to 2 decimal places
    
    if (this.commonFractions[rounded]) {
      return this.commonFractions[rounded];
    }

    // Handle mixed numbers
    if (decimal > 1) {
      const whole = Math.floor(decimal);
      const fraction = decimal - whole;
      
      if (this.commonFractions[Math.round(fraction * 100) / 100]) {
        return `${whole} ${this.commonFractions[Math.round(fraction * 100) / 100]}`;
      }
    }

    // For other fractions, try to find simple fraction representation
    const tolerance = 0.01;
    const denominators = [2, 3, 4, 5, 6, 8, 10, 12, 16];
    
    for (const denom of denominators) {
      for (let num = 1; num < denom; num++) {
        if (Math.abs(decimal - (num / denom)) < tolerance) {
          if (decimal > 1) {
            const whole = Math.floor(decimal);
            return `${whole} ${num}/${denom}`;
          } else {
            return `${num}/${denom}`;
          }
        }
      }
    }

    // Fall back to decimal
    return decimal.toString();
  }

  sanitizeForUrl(text) {
    if (!text) return '';
    return encodeURIComponent(text);
  }

  validateShoppingList(shoppingList) {
    if (!shoppingList) {
      return { isValid: false, error: 'Shopping list is required' };
    }

    if (!shoppingList.title || typeof shoppingList.title !== 'string' || shoppingList.title.trim() === '') {
      return { isValid: false, error: 'Shopping list must have a valid title' };
    }

    if (!shoppingList.items && !shoppingList.organized) {
      return { isValid: false, error: 'Shopping list must have items or organized categories' };
    }

    if (shoppingList.items && !Array.isArray(shoppingList.items)) {
      return { isValid: false, error: 'Shopping list items must be an array' };
    }

    return { isValid: true };
  }

  // Helper method to clean up malformed items
  sanitizeItem(item) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    return {
      quantity: typeof item.quantity === 'number' ? item.quantity : null,
      unit: typeof item.unit === 'string' ? item.unit : null,
      item: typeof item.item === 'string' ? item.item : 'Unknown item',
      category: item.category || 'pantry'
    };
  }

  // Helper method to flatten organized items into a single array
  flattenOrganizedItems(organized) {
    const items = [];
    Object.keys(organized).forEach(category => {
      organized[category].forEach(item => {
        items.push(item);
      });
    });
    return items;
  }

  // Method to handle different platforms
  getPlatformSpecificUrl(shoppingList, platform = 'ios') {
    const baseResult = this.generateReminderUrl(shoppingList, { platform });
    
    if (!baseResult.success) {
      return baseResult;
    }

    // Platform-specific modifications could go here
    // For now, both iOS and macOS use the same URL scheme
    return {
      ...baseResult,
      platform
    };
  }
}

module.exports = ReminderFormatter;