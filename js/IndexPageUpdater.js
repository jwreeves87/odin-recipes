const fs = require('fs');
const path = require('path');

class IndexPageUpdater {
  constructor() {
    this.indexPath = path.join(__dirname, '..', 'index.html');
    this.insertMarker = '<sl-card style="margin-top: 3rem; background: #ffffff; border: 2px solid #ff6b35; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"';
  }

  addRecipeToIndex(recipeData, filename) {
    try {
      // Read the current index.html content
      const indexContent = fs.readFileSync(this.indexPath, 'utf8');
      
      // Generate the recipe card HTML
      const recipeCardHtml = this.generateRecipeCard(recipeData, filename);
      
      // Find the insertion point (before the testimonials card)
      const insertIndex = indexContent.indexOf(this.insertMarker);
      
      if (insertIndex === -1) {
        throw new Error('Could not find insertion point in index.html');
      }
      
      // Insert the new recipe card
      const beforeInsert = indexContent.substring(0, insertIndex);
      const afterInsert = indexContent.substring(insertIndex);
      
      const updatedContent = beforeInsert + recipeCardHtml + '\n\n    ' + afterInsert;
      
      // Write the updated content back to index.html
      fs.writeFileSync(this.indexPath, updatedContent, 'utf8');
      
      return { success: true, message: 'Recipe added to index page' };
      
    } catch (error) {
      console.error('Error updating index page:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateRecipeCard(recipeData, filename) {
    const {
      title = 'Untitled Recipe',
      description = 'No description available',
      image = '',
      prepTime = '',
      cookTime = ''
    } = recipeData;

    // Calculate display time (prefer total time, fallback to cook time)
    let displayTime = 'Unknown Time';
    if (cookTime) {
      const timeText = this.formatTime(cookTime);
      if (timeText) displayTime = timeText;
    }

    return `<sl-card class="recipe-card" style="position: relative;">
      <div class="professional-badge">Imported Recipe</div>
      <img
        slot="image"
        src="${this.escapeHtml(image)}"
        alt="${this.escapeHtml(title)}"
        style="height: 200px; object-fit: cover;"
      />
      <strong style="color: #ff6b35; font-size: 1.2rem;">${this.escapeHtml(title)}</strong>
      <br />
      <sl-badge variant="success" size="small" style="margin: 0.5rem 0;">${displayTime}</sl-badge>
      <sl-badge variant="neutral" size="small">Imported Recipe</sl-badge>
      <br /><br />
      <small style="color: #495057; font-weight: 500; line-height: 1.5;">${this.escapeHtml(description)}</small>
      <div slot="footer">
        <sl-button variant="primary" href="recipes/${filename}">
          <sl-icon slot="prefix" name="book"></sl-icon>
          View Recipe
        </sl-button>
      </div>
    </sl-card>`;
  }

  formatTime(timeString) {
    if (!timeString) return '';
    
    // Handle ISO duration format (PT120M -> 2-Hour Process)
    if (timeString.startsWith('PT')) {
      const match = timeString.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (match) {
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        
        if (hours > 0) {
          return `${hours}-Hour Process`;
        } else if (minutes >= 60) {
          const h = Math.floor(minutes / 60);
          return `${h}-Hour Process`;
        } else if (minutes > 0) {
          return `${minutes}-Min Process`;
        }
      }
    }
    
    // If it's already formatted, return as-is
    if (timeString.includes('Hour') || timeString.includes('Min')) {
      return timeString;
    }
    
    return 'Quick Process';
  }

  removeRecipeFromIndex(filename) {
    try {
      // Read the current index.html content
      const indexContent = fs.readFileSync(this.indexPath, 'utf8');
      
      // Find the recipe card to remove
      const cardMatch = this.findRecipeCardInContent(indexContent, filename);
      
      if (!cardMatch.found) {
        return { 
          success: true, 
          message: `Recipe with filename ${filename} not found in index, nothing to remove` 
        };
      }
      
      // Remove the recipe card from content
      const beforeCard = indexContent.substring(0, cardMatch.startIndex);
      const afterCard = indexContent.substring(cardMatch.endIndex);
      
      // Clean up any extra whitespace
      const updatedContent = (beforeCard + afterCard).replace(/\n\n\n+/g, '\n\n');
      
      // Write the updated content back to index.html
      fs.writeFileSync(this.indexPath, updatedContent, 'utf8');
      
      return { success: true, message: `Recipe ${filename} removed from index page` };
      
    } catch (error) {
      console.error('Error removing recipe from index:', error.message);
      return { success: false, error: error.message };
    }
  }

  updateRecipeInIndex(recipeData, filename) {
    try {
      if (!recipeData) {
        return { success: false, error: 'Recipe data is required for update' };
      }

      // Read the current index.html content
      const indexContent = fs.readFileSync(this.indexPath, 'utf8');
      
      // Find the existing recipe card
      const cardMatch = this.findRecipeCardInContent(indexContent, filename);
      
      if (!cardMatch.found) {
        // If recipe doesn't exist, add it as new
        return {
          ...this.addRecipeToIndex(recipeData, filename),
          message: `Recipe not found in index, added as new: ${filename}`
        };
      }
      
      // Generate updated recipe card
      const updatedCardHtml = this.generateRecipeCard(recipeData, filename);
      
      // Replace the existing card
      const beforeCard = indexContent.substring(0, cardMatch.startIndex);
      const afterCard = indexContent.substring(cardMatch.endIndex);
      
      const updatedContent = beforeCard + updatedCardHtml + afterCard;
      
      // Write the updated content back to index.html
      fs.writeFileSync(this.indexPath, updatedContent, 'utf8');
      
      return { success: true, message: `Recipe ${filename} updated in index page` };
      
    } catch (error) {
      console.error('Error updating recipe in index:', error.message);
      return { success: false, error: error.message };
    }
  }

  findRecipeCardInContent(content, filename) {
    // Look for recipe card that contains the specific filename
    const recipePathPattern = `recipes/${filename}`;
    
    // Find all recipe cards
    const cardPattern = /<sl-card class="recipe-card"[\s\S]*?<\/sl-card>/g;
    let match;
    
    while ((match = cardPattern.exec(content)) !== null) {
      if (match[0].includes(recipePathPattern)) {
        return {
          found: true,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          cardContent: match[0]
        };
      }
    }
    
    return {
      found: false,
      startIndex: -1,
      endIndex: -1,
      cardContent: null
    };
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

module.exports = IndexPageUpdater;