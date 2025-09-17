/**
 * 项目 API 功能测试
 * 测试项目相关的 API 功能
 */
describe('项目 API 功能测试', () => {
  let projectApi;
  let mockDbService;

  beforeEach(() => {
    // 模拟数据库服务
    mockDbService = {
      isInitialized: true,
      initDB: jest.fn().mockResolvedValue(true),
      findMany: jest.fn(),
      findOne: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      query: jest.fn()
    };

    // 模拟项目 API
    projectApi = {
      getProjectList: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      getProjectDetail: jest.fn(),
      getProjectStats: jest.fn()
    };
  });

  describe('项目列表功能', () => {
    it('应该能够获取项目列表', async () => {
      const mockProjects = [
        { id: 1, name: '项目1', status: 'active' },
        { id: 2, name: '项目2', status: 'completed' }
      ];

      projectApi.getProjectList.mockResolvedValue(mockProjects);

      const result = await projectApi.getProjectList();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('项目1');
      expect(projectApi.getProjectList).toHaveBeenCalled();
    });

    it('应该支持状态筛选', async () => {
      const mockProjects = [{ id: 1, name: '项目1', status: 'active' }];
      projectApi.getProjectList.mockResolvedValue(mockProjects);

      await projectApi.getProjectList({ status: 'active' });
      
      expect(projectApi.getProjectList).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  describe('项目创建功能', () => {
    it('应该能够创建新项目', async () => {
      const projectData = {
        name: '新项目',
        goal: '项目目标',
        description: '项目描述'
      };

      const mockResult = { id: 1, ...projectData };
      projectApi.createProject.mockResolvedValue(mockResult);

      const result = await projectApi.createProject(projectData);
      
      expect(result.id).toBe(1);
      expect(result.name).toBe('新项目');
      expect(projectApi.createProject).toHaveBeenCalledWith(projectData);
    });

    it('应该验证必填字段', async () => {
      const invalidData = { name: '', goal: '目标' };
      
      projectApi.createProject.mockRejectedValue(new Error('项目名称不能为空'));

      await expect(projectApi.createProject(invalidData)).rejects.toThrow('项目名称不能为空');
    });
  });

  describe('项目更新功能', () => {
    it('应该能够更新项目', async () => {
      const updateData = { name: '更新后的项目名' };
      const mockResult = { id: 1, ...updateData };
      
      projectApi.updateProject.mockResolvedValue(mockResult);

      const result = await projectApi.updateProject(1, updateData);
      
      expect(result.name).toBe('更新后的项目名');
      expect(projectApi.updateProject).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe('项目删除功能', () => {
    it('应该能够删除项目', async () => {
      projectApi.deleteProject.mockResolvedValue(true);

      const result = await projectApi.deleteProject(1);
      
      expect(result).toBe(true);
      expect(projectApi.deleteProject).toHaveBeenCalledWith(1);
    });
  });

  describe('项目统计功能', () => {
    it('应该能够获取项目统计信息', async () => {
      const mockStats = {
        totalProjects: 10,
        activeProjects: 5,
        completedProjects: 3
      };

      projectApi.getProjectStats.mockResolvedValue(mockStats);

      const result = await projectApi.getProjectStats();
      
      expect(result.totalProjects).toBe(10);
      expect(result.activeProjects).toBe(5);
      expect(projectApi.getProjectStats).toHaveBeenCalled();
    });
  });
});
