const RecipeManager = require('../js/RecipeManager');
const RecipeRepository = require('../js/RecipeRepository');
const RecipeValidator = require('../js/RecipeValidator');
const IndexPageUpdater = require('../js/IndexPageUpdater');
const Recipe = require('../js/Recipe');

describe('RecipeManager', () => {
  let manager;
  let mockRepository;
  let mockValidator;
  let mockIndexUpdater;
  let sampleRecipeData;

  beforeEach(() => {
    mockRepository = {
      create: jasmine.createSpy('create'),
      findById: jasmine.createSpy('findById'),
      findAll: jasmine.createSpy('findAll'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete')
    };

    mockValidator = {
      validateForCreate: jasmine.createSpy('validateForCreate'),
      validateForUpdate: jasmine.createSpy('validateForUpdate')
    };

    mockIndexUpdater = {
      addRecipeToIndex: jasmine.createSpy('addRecipeToIndex'),
      removeRecipeFromIndex: jasmine.createSpy('removeRecipeFromIndex'),
      updateRecipeInIndex: jasmine.createSpy('updateRecipeInIndex')
    };

    manager = new RecipeManager(mockRepository, mockValidator, mockIndexUpdater);

    sampleRecipeData = {
      title: 'Test Brisket',
      description: 'A delicious brisket recipe',
      ingredients: ['Salt', 'Pepper', 'Beef Brisket'],
      instructions: ['Season the brisket', 'Smoke for 16 hours'],
      cookTime: 'PT16H',
      servings: '12'
    };
  });

  describe('constructor', () => {
    it('should initialize with default dependencies if none provided', () => {
      const managerWithDefaults = new RecipeManager();
      expect(managerWithDefaults.repository).toBeDefined();
      expect(managerWithDefaults.validator).toBeDefined();
      expect(managerWithDefaults.indexUpdater).toBeDefined();
    });

    it('should use provided dependencies', () => {
      expect(manager.repository).toBe(mockRepository);
      expect(manager.validator).toBe(mockValidator);
      expect(manager.indexUpdater).toBe(mockIndexUpdater);
    });
  });

  describe('createRecipe', () => {
    beforeEach(() => {
      mockValidator.validateForCreate.and.returnValue({
        isValid: true,
        errors: [],
        sanitizedData: sampleRecipeData
      });
      
      mockRepository.create.and.returnValue(Promise.resolve({
        ...sampleRecipeData,
        id: 'recipe-123',
        filename: 'recipe-123.html',
        createdAt: new Date('2023-01-01'),
        modifiedAt: new Date('2023-01-01')
      }));

      mockIndexUpdater.addRecipeToIndex.and.returnValue({ success: true });
    });

    it('should validate recipe data before creation', async () => {
      await manager.createRecipe(sampleRecipeData);

      expect(mockValidator.validateForCreate).toHaveBeenCalledWith(sampleRecipeData);
    });

    it('should return validation errors if data is invalid', async () => {
      mockValidator.validateForCreate.and.returnValue({
        isValid: false,
        errors: ['Title is required', 'Ingredients are required'],
        sanitizedData: {}
      });

      const result = await manager.createRecipe({});

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Title is required', 'Ingredients are required']);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create recipe with sanitized data if validation passes', async () => {
      const result = await manager.createRecipe(sampleRecipeData);

      expect(mockRepository.create).toHaveBeenCalledWith(jasmine.any(Recipe));
      expect(result.success).toBe(true);
      expect(result.recipe.id).toBe('recipe-123');
    });

    it('should update index page after successful creation', async () => {
      const createdRecipe = {
        ...sampleRecipeData,
        id: 'recipe-123',
        filename: 'recipe-123.html',
        createdAt: new Date('2023-01-01'),
        modifiedAt: new Date('2023-01-01')
      };

      mockRepository.create.and.returnValue(Promise.resolve(createdRecipe));

      await manager.createRecipe(sampleRecipeData);

      expect(mockIndexUpdater.addRecipeToIndex).toHaveBeenCalledWith(
        createdRecipe,
        'recipe-123.html'
      );
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.create.and.returnValue(Promise.reject(new Error('Storage error')));

      const result = await manager.createRecipe(sampleRecipeData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage error');
    });

    it('should succeed even if index update fails', async () => {
      mockIndexUpdater.addRecipeToIndex.and.returnValue({ success: false, error: 'Index error' });

      const result = await manager.createRecipe(sampleRecipeData);

      expect(result.success).toBe(true);
      expect(result.indexUpdateFailed).toBe(true);
    });
  });

  describe('getRecipe', () => {
    it('should return recipe if found', async () => {
      const foundRecipe = { ...sampleRecipeData, id: 'recipe-123' };
      mockRepository.findById.and.returnValue(Promise.resolve(foundRecipe));

      const result = await manager.getRecipe('recipe-123');

      expect(result.success).toBe(true);
      expect(result.recipe).toEqual(foundRecipe);
    });

    it('should return not found if recipe does not exist', async () => {
      mockRepository.findById.and.returnValue(Promise.resolve(null));

      const result = await manager.getRecipe('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle repository errors', async () => {
      mockRepository.findById.and.returnValue(Promise.reject(new Error('Database error')));

      const result = await manager.getRecipe('recipe-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('updateRecipe', () => {
    const existingRecipe = {
      ...sampleRecipeData,
      id: 'recipe-123',
      filename: 'recipe-123.html',
      createdAt: new Date('2023-01-01'),
      modifiedAt: new Date('2023-01-01')
    };

    beforeEach(() => {
      mockValidator.validateForUpdate.and.returnValue({
        isValid: true,
        errors: [],
        sanitizedData: { title: 'Updated Title' }
      });

      mockRepository.findById.and.returnValue(Promise.resolve(existingRecipe));
      mockRepository.update.and.returnValue(Promise.resolve({
        ...existingRecipe,
        title: 'Updated Title',
        modifiedAt: new Date('2023-01-02')
      }));

      mockIndexUpdater.updateRecipeInIndex.and.returnValue({ success: true });
    });

    it('should validate update data', async () => {
      const updates = { title: 'Updated Title' };

      await manager.updateRecipe('recipe-123', updates);

      expect(mockValidator.validateForUpdate).toHaveBeenCalledWith(updates);
    });

    it('should return validation errors if update data is invalid', async () => {
      mockValidator.validateForUpdate.and.returnValue({
        isValid: false,
        errors: ['Cannot update protected field: id'],
        sanitizedData: {}
      });

      const result = await manager.updateRecipe('recipe-123', { id: 'new-id' });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Cannot update protected field: id']);
    });

    it('should check if recipe exists before updating', async () => {
      mockRepository.findById.and.returnValue(Promise.resolve(null));

      const result = await manager.updateRecipe('nonexistent', { title: 'New Title' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update recipe with sanitized data', async () => {
      const updates = { title: 'Updated Title', description: 'Updated description' };
      mockValidator.validateForUpdate.and.returnValue({
        isValid: true,
        errors: [],
        sanitizedData: updates
      });

      await manager.updateRecipe('recipe-123', updates);

      expect(mockRepository.update).toHaveBeenCalledWith('recipe-123', updates);
    });

    it('should update index page after successful update', async () => {
      const updatedRecipe = {
        ...existingRecipe,
        title: 'Updated Title',
        modifiedAt: new Date('2023-01-02')
      };

      mockRepository.update.and.returnValue(Promise.resolve(updatedRecipe));

      await manager.updateRecipe('recipe-123', { title: 'Updated Title' });

      expect(mockIndexUpdater.updateRecipeInIndex).toHaveBeenCalledWith(
        updatedRecipe,
        'recipe-123.html'
      );
    });

    it('should handle repository update errors', async () => {
      mockRepository.update.and.returnValue(Promise.reject(new Error('Update failed')));

      const result = await manager.updateRecipe('recipe-123', { title: 'New Title' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Update failed');
    });
  });

  describe('deleteRecipe', () => {
    const existingRecipe = {
      ...sampleRecipeData,
      id: 'recipe-123',
      filename: 'recipe-123.html'
    };

    beforeEach(() => {
      mockRepository.findById.and.returnValue(Promise.resolve(existingRecipe));
      mockRepository.delete.and.returnValue(Promise.resolve(true));
      mockIndexUpdater.removeRecipeFromIndex.and.returnValue({ success: true });
    });

    it('should check if recipe exists before deleting', async () => {
      mockRepository.findById.and.returnValue(Promise.resolve(null));

      const result = await manager.deleteRecipe('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should delete recipe from repository', async () => {
      await manager.deleteRecipe('recipe-123');

      expect(mockRepository.delete).toHaveBeenCalledWith('recipe-123');
    });

    it('should remove recipe from index page after successful deletion', async () => {
      await manager.deleteRecipe('recipe-123');

      expect(mockIndexUpdater.removeRecipeFromIndex).toHaveBeenCalledWith(
        'recipe-123.html'
      );
    });

    it('should handle repository delete errors', async () => {
      mockRepository.delete.and.returnValue(Promise.reject(new Error('Delete failed')));

      const result = await manager.deleteRecipe('recipe-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Delete failed');
    });

    it('should succeed even if index update fails', async () => {
      mockIndexUpdater.removeRecipeFromIndex.and.returnValue({ 
        success: false, 
        error: 'Index update failed' 
      });

      const result = await manager.deleteRecipe('recipe-123');

      expect(result.success).toBe(true);
      expect(result.indexUpdateFailed).toBe(true);
    });
  });

  describe('getAllRecipes', () => {
    it('should return all recipes from repository', async () => {
      const allRecipes = [
        { ...sampleRecipeData, id: 'recipe-1' },
        { ...sampleRecipeData, id: 'recipe-2', title: 'Recipe 2' }
      ];

      mockRepository.findAll.and.returnValue(Promise.resolve(allRecipes));

      const result = await manager.getAllRecipes();

      expect(result.success).toBe(true);
      expect(result.recipes).toEqual(allRecipes);
    });

    it('should handle repository errors', async () => {
      mockRepository.findAll.and.returnValue(Promise.reject(new Error('Database error')));

      const result = await manager.getAllRecipes();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('searchRecipes', () => {
    const allRecipes = [
      { id: 'recipe-1', title: 'BBQ Brisket', description: 'Smoked beef brisket' },
      { id: 'recipe-2', title: 'Teriyaki Salmon', description: 'Grilled salmon with teriyaki' },
      { id: 'recipe-3', title: 'Smoked Ribs', description: 'Baby back ribs' }
    ];

    beforeEach(() => {
      mockRepository.findAll.and.returnValue(Promise.resolve(allRecipes));
    });

    it('should search by title', async () => {
      const result = await manager.searchRecipes('brisket');

      expect(result.success).toBe(true);
      expect(result.recipes).toHaveSize(1);
      expect(result.recipes[0].title).toBe('BBQ Brisket');
    });

    it('should search by description', async () => {
      const result = await manager.searchRecipes('salmon');

      expect(result.success).toBe(true);
      expect(result.recipes).toHaveSize(1);
      expect(result.recipes[0].title).toBe('Teriyaki Salmon');
    });

    it('should be case insensitive', async () => {
      const result = await manager.searchRecipes('SMOKED');

      expect(result.success).toBe(true);
      expect(result.recipes).toHaveSize(2);
    });

    it('should return empty array if no matches', async () => {
      const result = await manager.searchRecipes('pizza');

      expect(result.success).toBe(true);
      expect(result.recipes).toEqual([]);
    });

    it('should handle empty search term', async () => {
      const result = await manager.searchRecipes('');

      expect(result.success).toBe(true);
      expect(result.recipes).toEqual(allRecipes);
    });
  });
});