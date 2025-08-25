const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const RecipeDataCleaner = require('./js/RecipeDataCleaner');
const IndexPageUpdater = require('./js/IndexPageUpdater');
const RecipeManager = require('./js/RecipeManager');
const ShoppingListManager = require('./js/ShoppingListManager');

const app = express();
const PORT = 3000;

// Initialize managers
const recipeManager = new RecipeManager();
const shoppingListManager = new ShoppingListManager(recipeManager.repository);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for large HTML files
app.use(express.static('.'));

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Simple recipe scraping endpoint
app.post('/api/scrape-recipe', async (req, res) => {
  const { url } = req.body || {};
  const dataCleaner = new RecipeDataCleaner();
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Look for JSON-LD recipe data (most reliable)
    let recipeData = null;
    
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const jsonText = $(elem).html();
        let jsonLD = JSON.parse(jsonText);
        
        // Handle arrays and @graph structures
        if (Array.isArray(jsonLD)) {
          jsonLD = jsonLD.find(item => item['@type'] === 'Recipe');
        } else if (jsonLD['@graph'] && Array.isArray(jsonLD['@graph'])) {
          jsonLD = jsonLD['@graph'].find(item => item['@type'] === 'Recipe');
        }
        
        if (jsonLD && jsonLD['@type'] === 'Recipe') {
          const cleanedData = dataCleaner.cleanRecipeData(jsonLD);
          recipeData = {
            ...cleanedData,
            sourceUrl: url
          };
          return false; // Break out of loop
        }
      } catch (e) {
        // Continue to next script tag
      }
    });
    
    if (!recipeData) {
      return res.status(404).json({ 
        error: 'No recipe data found. This page may not have structured recipe data.' 
      });
    }
    
    res.json({ recipe: recipeData });
    
  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ error: `Failed to scrape recipe: ${error.message}` });
  }
});

// Save recipe endpoint
app.post('/api/save-recipe', async (req, res) => {
  const { html, filename, recipeData } = req.body || {};
  
  if (!html || !filename) {
    return res.status(400).json({ error: 'HTML content and filename are required' });
  }

  try {
    const filepath = path.join(__dirname, 'recipes', filename);
    
    // Ensure recipes directory exists
    if (!fs.existsSync(path.join(__dirname, 'recipes'))) {
      fs.mkdirSync(path.join(__dirname, 'recipes'));
    }
    
    // Save the recipe HTML file
    fs.writeFileSync(filepath, html, 'utf8');
    
    // Update the index page if recipeData is provided
    let indexUpdateResult = { success: true };
    if (recipeData) {
      const indexUpdater = new IndexPageUpdater();
      indexUpdateResult = indexUpdater.addRecipeToIndex(recipeData, filename);
    }
    
    res.json({ 
      success: true, 
      message: `Recipe saved as ${filename}${indexUpdateResult.success ? ' and added to index page' : ''}`,
      filepath: `/recipes/${filename}`,
      indexUpdated: indexUpdateResult.success
    });
    
  } catch (error) {
    console.error('Save error:', error.message);
    res.status(500).json({ error: `Failed to save recipe: ${error.message}` });
  }
});

// CRUD API Endpoints

// GET /api/recipes - Get all recipes or search recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const { search } = req.query;
    
    let result;
    if (search !== undefined && search !== null) {
      result = await recipeManager.searchRecipes(search);
    } else {
      result = await recipeManager.getAllRecipes();
    }
    
    if (result.success) {
      res.json({
        success: true,
        recipes: result.recipes
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting recipes:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/recipes/:id - Get specific recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await recipeManager.getRecipe(id);
    
    if (result.success) {
      res.json({
        success: true,
        recipe: result.recipe
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting recipe:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/recipes - Create new recipe
app.post('/api/recipes', async (req, res) => {
  try {
    const recipeData = req.body;
    const result = await recipeManager.createRecipe(recipeData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        recipe: result.recipe,
        indexUpdateFailed: result.indexUpdateFailed
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.errors || [result.error]
      });
    }
  } catch (error) {
    console.error('Error creating recipe:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/recipes/:id - Update existing recipe
app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const result = await recipeManager.updateRecipe(id, updates);
    
    if (result.success) {
      res.json({
        success: true,
        recipe: result.recipe,
        indexUpdateFailed: result.indexUpdateFailed
      });
    } else if (result.errors) {
      res.status(400).json({
        success: false,
        errors: result.errors
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error updating recipe:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/recipes/:id - Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await recipeManager.deleteRecipe(id);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Recipe ${id} deleted successfully`,
        indexUpdateFailed: result.indexUpdateFailed
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error deleting recipe:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Shopping List API Endpoints

// POST /api/shopping-lists/single - Generate shopping list from single recipe
app.post('/api/shopping-lists/single', async (req, res) => {
  try {
    const { recipeId, listName, scaleMultiplier } = req.body;
    
    if (!recipeId) {
      return res.status(400).json({
        success: false,
        error: 'Recipe ID is required'
      });
    }

    const options = {};
    if (listName) options.listName = listName;
    if (scaleMultiplier) options.scaleMultiplier = scaleMultiplier;

    const result = await shoppingListManager.generateFromSingleRecipe(recipeId, options);

    if (result.success) {
      res.json({
        success: true,
        shoppingList: result.shoppingList
      });
    } else {
      const statusCode = result.error.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Error generating single recipe shopping list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/shopping-lists/multiple - Generate shopping list from multiple recipes
app.post('/api/shopping-lists/multiple', async (req, res) => {
  try {
    const { recipeIds, listName, scaleMultiplier, categoryFilter } = req.body;
    
    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipe IDs array is required and must not be empty'
      });
    }

    const options = {};
    if (listName) options.listName = listName;
    if (scaleMultiplier) options.scaleMultiplier = scaleMultiplier;
    if (categoryFilter) options.categoryFilter = categoryFilter;

    const result = await shoppingListManager.generateFromMultipleRecipes(recipeIds, options);

    if (result.success) {
      res.json({
        success: true,
        shoppingList: result.shoppingList,
        warnings: result.warnings || []
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Error generating multiple recipes shopping list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/shopping-lists/all - Generate shopping list from all recipes
app.post('/api/shopping-lists/all', async (req, res) => {
  try {
    const { listName, scaleMultiplier, categoryFilter } = req.body;

    const options = {};
    if (listName) options.listName = listName;
    if (scaleMultiplier) options.scaleMultiplier = scaleMultiplier;
    if (categoryFilter) options.categoryFilter = categoryFilter;

    const result = await shoppingListManager.generateFromAllRecipes(options);

    if (result.success) {
      res.json({
        success: true,
        shoppingList: result.shoppingList,
        warnings: result.warnings || []
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Error generating all recipes shopping list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/shopping-lists/reminders-url - Generate Reminders app URL from shopping list
app.post('/api/shopping-lists/reminders-url', async (req, res) => {
  try {
    const { shoppingList, organizeByCategory, listName } = req.body;
    
    if (!shoppingList) {
      return res.status(400).json({
        success: false,
        error: 'Shopping list data is required'
      });
    }

    const options = {};
    if (organizeByCategory !== undefined) options.organizeByCategory = organizeByCategory;
    if (listName) options.listName = listName;

    const result = shoppingListManager.generateReminderUrl(shoppingList, options);

    if (result.success) {
      // Also get the formatted text for the response
      const formatResult = shoppingListManager.formatter.formatForReminders(shoppingList, options);
      
      res.json({
        success: true,
        url: result.url,
        reminderText: formatResult.success ? formatResult.reminderText : null,
        listName: result.listName
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error generating reminders URL:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/shopping-lists/export/:recipeId - Direct export endpoint for single recipe
app.get('/api/shopping-lists/export/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { format = 'reminders', listName, scale } = req.query;
    
    const options = {};
    if (listName) options.listName = listName;
    if (scale) options.scaleMultiplier = parseFloat(scale);

    // Generate shopping list
    const listResult = await shoppingListManager.generateFromSingleRecipe(recipeId, options);

    if (!listResult.success) {
      const statusCode = listResult.error.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: listResult.error
      });
    }

    if (format === 'reminders') {
      // Generate Reminders URL and redirect
      const urlResult = shoppingListManager.generateReminderUrl(listResult.shoppingList);
      
      if (urlResult.success) {
        res.redirect(urlResult.url);
      } else {
        res.status(400).json({
          success: false,
          error: urlResult.error
        });
      }
    } else if (format === 'json') {
      // Return JSON format
      res.json({
        success: true,
        shoppingList: listResult.shoppingList
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format. Use "reminders" or "json".'
      });
    }
  } catch (error) {
    console.error('Error exporting shopping list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling middleware for malformed JSON (must be after routes)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request entity too large' });
  }
  next(err);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;