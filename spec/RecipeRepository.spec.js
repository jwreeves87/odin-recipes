const RecipeRepository = require('../js/RecipeRepository');
const Recipe = require('../js/Recipe');
const FileSystemStorage = require('../js/FileSystemStorage');

describe('RecipeRepository', () => {
  let repository;
  let mockStorage;
  let sampleRecipe;

  beforeEach(() => {
    mockStorage = {
      readRecipeFile: jasmine.createSpy('readRecipeFile'),
      writeRecipeFile: jasmine.createSpy('writeRecipeFile'),
      deleteRecipeFile: jasmine.createSpy('deleteRecipeFile'),
      listRecipeFiles: jasmine.createSpy('listRecipeFiles'),
      fileExists: jasmine.createSpy('fileExists')
    };

    repository = new RecipeRepository(mockStorage);
    
    sampleRecipe = new Recipe({
      title: 'Test Brisket',
      description: 'Test description',
      ingredients: ['Salt', 'Pepper'],
      instructions: ['Season', 'Smoke'],
      prepTime: 'PT30M',
      cookTime: 'PT16H',
      servings: '12'
    });
  });

  describe('constructor', () => {
    it('should initialize with FileSystemStorage if no storage provided', () => {
      const repo = new RecipeRepository();
      expect(repo.storage).toBeDefined();
    });

    it('should use provided storage instance', () => {
      expect(repository.storage).toBe(mockStorage);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockStorage.fileExists.and.returnValue(false);
      mockStorage.writeRecipeFile.and.returnValue(Promise.resolve('recipe-id-123.html'));
    });

    it('should generate unique ID for new recipe', async () => {
      const result = await repository.create(sampleRecipe);
      
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should set creation and modification timestamps', async () => {
      const beforeCreate = new Date();
      const result = await repository.create(sampleRecipe);
      const afterCreate = new Date();
      
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.modifiedAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(result.modifiedAt.getTime()).toEqual(result.createdAt.getTime());
    });

    it('should save recipe to storage with generated filename', async () => {
      const result = await repository.create(sampleRecipe);
      
      expect(mockStorage.writeRecipeFile).toHaveBeenCalledWith(
        result, 
        jasmine.stringMatching(/^[0-9a-f-]+\.html$/)
      );
    });

    it('should return recipe with metadata', async () => {
      const result = await repository.create(sampleRecipe);
      
      expect(result.title).toBe(sampleRecipe.title);
      expect(result.description).toBe(sampleRecipe.description);
      expect(result.id).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.modifiedAt).toBeDefined();
    });
  });

  describe('findById', () => {
    const recipeId = 'test-id-123';
    const filename = 'test-id-123.html';

    it('should return null if recipe not found', async () => {
      mockStorage.fileExists.and.returnValue(false);
      
      const result = await repository.findById(recipeId);
      expect(result).toBeNull();
    });

    it('should return recipe if found', async () => {
      mockStorage.fileExists.and.returnValue(true);
      mockStorage.readRecipeFile.and.returnValue(Promise.resolve({
        ...sampleRecipe,
        id: recipeId,
        filename: filename,
        createdAt: new Date('2023-01-01'),
        modifiedAt: new Date('2023-01-02')
      }));
      
      const result = await repository.findById(recipeId);
      
      expect(result.id).toBe(recipeId);
      expect(result.title).toBe(sampleRecipe.title);
      expect(mockStorage.readRecipeFile).toHaveBeenCalledWith(filename);
    });
  });

  describe('update', () => {
    const recipeId = 'test-id-123';
    const filename = 'test-id-123.html';
    let existingRecipe;

    beforeEach(() => {
      existingRecipe = {
        ...sampleRecipe,
        id: recipeId,
        filename: filename,
        createdAt: new Date('2023-01-01'),
        modifiedAt: new Date('2023-01-01')
      };
      
      mockStorage.fileExists.and.returnValue(true);
      mockStorage.readRecipeFile.and.returnValue(Promise.resolve(existingRecipe));
      mockStorage.writeRecipeFile.and.returnValue(Promise.resolve(filename));
    });

    it('should return null if recipe not found', async () => {
      mockStorage.fileExists.and.returnValue(false);
      
      const result = await repository.update(recipeId, { title: 'Updated Title' });
      expect(result).toBeNull();
    });

    it('should update recipe properties', async () => {
      const updates = { title: 'Updated Brisket', description: 'Updated description' };
      
      const result = await repository.update(recipeId, updates);
      
      expect(result.title).toBe('Updated Brisket');
      expect(result.description).toBe('Updated description');
      expect(result.ingredients).toEqual(sampleRecipe.ingredients); // unchanged
    });

    it('should update modifiedAt timestamp', async () => {
      const beforeUpdate = new Date();
      const result = await repository.update(recipeId, { title: 'Updated Title' });
      const afterUpdate = new Date();
      
      expect(result.modifiedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(result.modifiedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      expect(result.createdAt).toEqual(existingRecipe.createdAt); // unchanged
    });

    it('should save updated recipe to storage', async () => {
      const updates = { title: 'Updated Title' };
      
      await repository.update(recipeId, updates);
      
      expect(mockStorage.writeRecipeFile).toHaveBeenCalledWith(
        jasmine.objectContaining({ title: 'Updated Title' }),
        filename
      );
    });
  });

  describe('delete', () => {
    const recipeId = 'test-id-123';
    const filename = 'test-id-123.html';

    it('should return false if recipe not found', async () => {
      mockStorage.fileExists.and.returnValue(false);
      
      const result = await repository.delete(recipeId);
      expect(result).toBe(false);
    });

    it('should delete recipe file and return true', async () => {
      mockStorage.fileExists.and.returnValue(true);
      mockStorage.deleteRecipeFile.and.returnValue(Promise.resolve(true));
      
      const result = await repository.delete(recipeId);
      
      expect(result).toBe(true);
      expect(mockStorage.deleteRecipeFile).toHaveBeenCalledWith(filename);
    });
  });

  describe('findAll', () => {
    it('should return empty array if no recipes', async () => {
      mockStorage.listRecipeFiles.and.returnValue(Promise.resolve([]));
      
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    it('should return all recipes with metadata', async () => {
      const recipe1 = { ...sampleRecipe, id: 'id1', filename: 'id1.html' };
      const recipe2 = { ...sampleRecipe, id: 'id2', filename: 'id2.html', title: 'Recipe 2' };
      
      mockStorage.listRecipeFiles.and.returnValue(Promise.resolve(['id1.html', 'id2.html']));
      mockStorage.readRecipeFile.and.callFake((filename) => {
        if (filename === 'id1.html') return Promise.resolve(recipe1);
        if (filename === 'id2.html') return Promise.resolve(recipe2);
      });
      
      const result = await repository.findAll();
      
      expect(result).toHaveSize(2);
      expect(result[0].id).toBe('id1');
      expect(result[1].id).toBe('id2');
      expect(result[1].title).toBe('Recipe 2');
    });
  });
});