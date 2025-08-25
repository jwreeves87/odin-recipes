class Recipe {
  constructor(data = {}) {
    // Handle null/undefined data
    if (!data || typeof data !== 'object') {
      data = {};
    }
    
    // Sanitize title - handle arrays and non-strings
    let title = data.title || 'Untitled Recipe';
    if (Array.isArray(title)) {
      title = title.join(' ') || 'Untitled Recipe';
    } else if (typeof title !== 'string') {
      title = String(title) || 'Untitled Recipe';
    }
    this.title = title;
    
    // Sanitize other string fields
    this.description = this.sanitizeStringField(data.description) || '';
    this.image = this.sanitizeStringField(data.image) || '';
    this.prepTime = this.sanitizeStringField(data.prepTime) || '';
    this.cookTime = this.sanitizeStringField(data.cookTime) || '';
    this.servings = this.sanitizeStringField(data.servings) || '';
    this.author = this.sanitizeStringField(data.author) || '';
    this.sourceUrl = this.sanitizeStringField(data.sourceUrl) || '';
    
    // Ensure arrays
    this.ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
    this.instructions = Array.isArray(data.instructions) ? data.instructions : [];
    
    // Handle metadata fields (from repository operations)
    this.id = data.id || null;
    this.filename = data.filename || null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
    this.modifiedAt = data.modifiedAt ? new Date(data.modifiedAt) : null;
  }

  sanitizeStringField(field) {
    if (!field) return '';
    if (Array.isArray(field)) {
      return field.join(' ');
    }
    if (typeof field !== 'string') {
      return String(field);
    }
    return field;
  }

  getFilename() {
    return this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 50) + '.html';
  }

  getSourceDomain() {
    if (!this.sourceUrl) return '';
    try {
      return new URL(this.sourceUrl).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  hasImage() {
    return !!this.image;
  }

  hasSource() {
    return !!this.sourceUrl;
  }

  hasDescription() {
    return !!this.description;
  }

  hasIngredients() {
    return this.ingredients.length > 0;
  }

  hasInstructions() {
    return this.instructions.length > 0;
  }

  hasTiming() {
    return !!(this.prepTime || this.cookTime || this.servings);
  }

  hasMetadata() {
    return !!(this.id && this.createdAt);
  }

  isNew() {
    return !this.hasMetadata();
  }

  getAge() {
    if (!this.createdAt) return null;
    return Date.now() - this.createdAt.getTime();
  }

  wasModified() {
    if (!this.createdAt || !this.modifiedAt) return false;
    return this.modifiedAt.getTime() !== this.createdAt.getTime();
  }

  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
      title: this.title,
      description: this.description,
      image: this.image,
      prepTime: this.prepTime,
      cookTime: this.cookTime,
      servings: this.servings,
      author: this.author,
      sourceUrl: this.sourceUrl,
      ingredients: [...this.ingredients],
      instructions: [...this.instructions]
    };
  }

  clone() {
    return new Recipe(this.toJSON());
  }
}

// Make available for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Recipe;
} else if (typeof window !== 'undefined') {
  window.Recipe = Recipe;
}