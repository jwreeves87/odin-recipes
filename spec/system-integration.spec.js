const RecipeDataCleaner = require('../js/RecipeDataCleaner');
const Recipe = require('../js/Recipe');
const RecipeTemplate = require('../js/RecipeTemplate');
const RecipeGenerator = require('../js/RecipeGenerator');
const IndexPageUpdater = require('../js/IndexPageUpdater');
const fs = require('fs');
const path = require('path');

describe('System Integration Tests', function() {
  
  describe('Complete Recipe Import Workflow', function() {
    let mockJsonLDData;
    
    beforeEach(function() {
      mockJsonLDData = {
        "@type": "Recipe",
        "name": "Integration Test Smoked Salmon",
        "description": "A complete integration test recipe with all components",
        "image": [
          "https://example.com/salmon1.jpg",
          "https://example.com/salmon2.jpg"
        ],
        "prepTime": "PT15M",
        "cookTime": "PT2H",
        "totalTime": "PT2H15M",
        "recipeYield": ["4", "4 servings"],
        "recipeIngredient": [
          "2 lb salmon fillets",
          "2 tbsp brown sugar",
          "1 tbsp soy sauce",
          "1 tsp ginger",
          "<img src='contamination.jpg'>", // Should be filtered
          "Transfer salmon to smoker and cook", // Should be filtered
          "1 tsp white vinegar"
        ],
        "recipeInstructions": [
          {
            "@type": "HowToStep",
            "text": "Mix brown sugar, soy sauce, and ginger in a bowl"
          },
          {
            "@type": "HowToStep", 
            "text": "Brush mixture over salmon fillets"
          },
          "Smoke at 225°F for 2 hours until internal temperature reaches 145°F",
          "John says: This recipe is amazing!", // Should be filtered
          "<img src='step.jpg' alt='smoking salmon'>", // Should be filtered
          {
            "@type": "HowToStep",
            "text": "Let rest for 5 minutes before serving"
          }
        ],
        "author": {
          "@type": "Person",
          "name": "Integration Test Chef"
        },
        "recipeCategory": "Main Course",
        "recipeCuisine": "American",
        "nutrition": {
          "@type": "NutritionInformation",
          "calories": "280 kcal",
          "protein": "35g"
        }
      };
    });

    it('should process complete workflow from JSON-LD to HTML', function() {
      // Step 1: Clean the raw data
      const cleaner = new RecipeDataCleaner();
      const cleanedData = cleaner.cleanRecipeData(mockJsonLDData);

      expect(cleanedData.title).toBe("Integration Test Smoked Salmon");
      expect(cleanedData.description).toBe("A complete integration test recipe with all components");
      expect(cleanedData.image).toBe("https://example.com/salmon1.jpg");
      expect(cleanedData.author).toBe("Integration Test Chef");

      // Verify contamination was filtered out
      expect(cleanedData.ingredients).not.toContain("Transfer salmon to smoker and cook");
      expect(cleanedData.instructions).not.toContain("John says: This recipe is amazing!");
      
      // Verify good data remains
      expect(cleanedData.ingredients).toContain("2 lb salmon fillets");
      expect(cleanedData.ingredients).toContain("2 tbsp brown sugar");
      expect(cleanedData.instructions).toContain("Mix brown sugar, soy sauce, and ginger in a bowl");

      // Step 2: Create Recipe object
      const recipe = new Recipe({...cleanedData, sourceUrl: "https://example.com/recipe"});

      expect(recipe.title).toBe("Integration Test Smoked Salmon");
      expect(recipe.hasIngredients()).toBe(true);
      expect(recipe.hasInstructions()).toBe(true);
      expect(recipe.hasImage()).toBe(true);
      expect(recipe.hasSource()).toBe(true);
      expect(recipe.getFilename()).toBe("integrationtestsmokedsalmon.html");
      expect(recipe.getSourceDomain()).toBe("example.com");

      // Step 3: Generate HTML using template
      const template = new RecipeTemplate();
      const html = template.render(recipe);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Integration Test Smoked Salmon");
      expect(html).toContain("https://example.com/salmon1.jpg");
      expect(html).toContain("2 lb salmon fillets");
      expect(html).toContain("Mix brown sugar, soy sauce, and ginger");
      expect(html).toContain("Integration Test Chef");
      expect(html).toContain("example.com");
      expect(html).not.toContain("Transfer salmon to smoker and cook");
      expect(html).not.toContain("John says: This recipe is amazing!");

      // Step 4: Use RecipeGenerator for complete workflow
      const generator = new RecipeGenerator();
      const result = generator.generate(cleanedData);

      expect(result.html).toContain("Integration Test Smoked Salmon");
      expect(result.filename).toBe("integrationtestsmokedsalmon.html");
    });

    it('should handle data quality scenarios', function() {
      const poorQualityData = {
        "@type": "Recipe",
        "name": "Poor Quality Recipe",
        "description": "",
        "recipeIngredient": [
          "1 cup flour",
          "<script>alert('xss')</script>", // Malicious
          "", // Empty
          "Continue cooking until done", // Instruction-like
          "2 eggs"
        ],
        "recipeInstructions": [
          "Mix ingredients",
          "Reply to @chef: Great recipe!", // Comment-like
          "", // Empty
          "<img src='step.jpg'>", // HTML
          "Bake until golden"
        ],
        "author": ""
      };

      const cleaner = new RecipeDataCleaner();
      const cleaned = cleaner.cleanRecipeData(poorQualityData);
      const recipe = new Recipe(cleaned);
      const generator = new RecipeGenerator();
      const result = generator.generate(cleaned);

      // Should have filtered out problematic content
      expect(recipe.ingredients.length).toBe(2); // Only "1 cup flour" and "2 eggs"
      expect(recipe.instructions.length).toBe(2); // Only "Mix ingredients" and "Bake until golden"
      
      // HTML should be safe
      expect(result.html).not.toContain("<script>");
      expect(result.html).not.toContain("Reply to @chef");
      expect(result.html).toContain("1 cup flour");
      expect(result.html).toContain("Mix ingredients");
    });

    it('should generate index page card HTML', function() {
      const updater = new IndexPageUpdater();
      const recipeData = {
        title: "Integration Test Recipe",
        description: "A test recipe for index page integration",
        image: "https://example.com/test.jpg",
        cookTime: "PT45M"
      };

      const cardHtml = updater.generateRecipeCard(recipeData, "integrationtest.html");

      expect(cardHtml).toContain("Integration Test Recipe");
      expect(cardHtml).toContain("A test recipe for index page integration");
      expect(cardHtml).toContain("https://example.com/test.jpg");
      expect(cardHtml).toContain("integrationtest.html");
      expect(cardHtml).toContain("45-Min Process");
      expect(cardHtml).toContain("Imported Recipe");
      expect(cardHtml).toContain("sl-card");
      expect(cardHtml).toContain("recipe-card");
    });
  });

  describe('Error Handling and Edge Cases', function() {
    it('should handle completely empty data gracefully', function() {
      const cleaner = new RecipeDataCleaner();
      const cleaned = cleaner.cleanRecipeData({});
      const recipe = new Recipe(cleaned);
      const generator = new RecipeGenerator();
      const result = generator.generate(cleaned);

      expect(result.html).toContain("Untitled Recipe");
      expect(result.filename).toBe("untitledrecipe.html");
      expect(result.html).toContain("<!DOCTYPE html>");
    });

    it('should handle malformed data structures', function() {
      const malformedData = {
        name: ["Array", "Instead", "Of", "String"],
        recipeIngredient: "Single string instead of array",
        recipeInstructions: {
          notAnArray: "This should not break the system"
        },
        author: 12345 // Number instead of string/object
      };

      const cleaner = new RecipeDataCleaner();
      
      expect(() => {
        const cleaned = cleaner.cleanRecipeData(malformedData);
        const recipe = new Recipe(cleaned);
        const generator = new RecipeGenerator();
        const result = generator.generate(cleaned);
      }).not.toThrow();
    });

    it('should handle extremely long content', function() {
      const longTitle = "A".repeat(1000);
      const longDescription = "B".repeat(5000);
      const longIngredient = "C".repeat(500);
      const longInstruction = "D".repeat(1000);

      const longData = {
        name: longTitle,
        description: longDescription,
        recipeIngredient: [longIngredient],
        recipeInstructions: [longInstruction]
      };

      const cleaner = new RecipeDataCleaner();
      const cleaned = cleaner.cleanRecipeData(longData);
      const recipe = new Recipe(cleaned);

      // Should truncate filename appropriately
      expect(recipe.getFilename().length).toBeLessThanOrEqual(55);
      
      // Should handle long content without breaking
      const generator = new RecipeGenerator();
      const result = generator.generate(cleaned);
      expect(result.html).toContain("<!DOCTYPE html>");
    });

    it('should maintain data integrity through the pipeline', function() {
      const testData = {
        name: "Data Integrity Test Recipe",
        description: "Testing data flows correctly through all components",
        image: "https://example.com/integrity.jpg",
        prepTime: "PT20M",
        cookTime: "PT1H",
        recipeYield: "6 servings",
        recipeIngredient: [
          "3 cups test ingredient A",
          "2 tbsp test ingredient B"
        ],
        recipeInstructions: [
          "Test instruction step 1",
          "Test instruction step 2"
        ],
        author: { name: "Integrity Test Chef" }
      };

      // Process through complete pipeline
      const cleaner = new RecipeDataCleaner();
      const cleaned = cleaner.cleanRecipeData(testData);
      cleaned.sourceUrl = "https://integrity.com/test"; // Add sourceUrl to cleaned data
      const generator = new RecipeGenerator();
      const result = generator.generate(cleaned);

      // Verify no data loss or corruption
      expect(result.html).toContain("Data Integrity Test Recipe");
      expect(result.html).toContain("Testing data flows correctly");
      expect(result.html).toContain("https://example.com/integrity.jpg");
      expect(result.html).toContain("3 cups test ingredient A");
      expect(result.html).toContain("2 tbsp test ingredient B");
      expect(result.html).toContain("Test instruction step 1");
      expect(result.html).toContain("Test instruction step 2");
      expect(result.html).toContain("Integrity Test Chef");
      expect(result.html).toContain("PT20M");
      expect(result.html).toContain("PT1H");
      expect(result.html).toContain("6 servings");

      // Verify HTML structure integrity
      expect(result.html).toMatch(/^<!DOCTYPE html>/);
      expect(result.html).toMatch(/<\/html>$/);
      expect((result.html.match(/<sl-card/g) || []).length).toBeGreaterThanOrEqual(3);
    });
  });
});