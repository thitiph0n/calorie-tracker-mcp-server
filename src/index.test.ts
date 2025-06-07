import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalorieTrackerMCP } from './index';

// Mock the McpAgent and McpServer
vi.mock('agents/mcp', () => ({
  McpAgent: class MockMcpAgent {
    server = {
      tool: vi.fn(),
    };
    props = {};
    env = {};

    constructor() {
      // Make constructor public in mock
    }

    static serveSSE = vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(new Response('SSE response')),
    });

    static serve = vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(new Response('MCP response')),
    });
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    tool: vi.fn(),
  })),
}));

// Mock all tool handlers
vi.mock('./tools/index.js', () => ({
  listEntriesHandler: vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: 'Listed entries' }] }),
  addEntryHandler: vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: 'Added entry' }] }),
  updateEntryHandler: vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: 'Updated entry' }] }),
  deleteEntryHandler: vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: 'Deleted entry' }] }),
  registerUserHandler: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Registered user' }],
  }),
  revokeUserHandler: vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: 'Revoked user' }] }),
}));

describe('CalorieTrackerMCP', () => {
  let mcpInstance: CalorieTrackerMCP;

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore - Using protected constructor in test
    mcpInstance = new CalorieTrackerMCP();
  });

  describe('constructor', () => {
    it('should create MCP server with correct name and version', () => {
      expect(mcpInstance.server).toBeDefined();
    });
  });

  describe('init', () => {
    it('should register all required tools', async () => {
      await mcpInstance.init();

      // Verify that tool() was called for each expected tool
      expect(mcpInstance.server.tool).toHaveBeenCalledWith(
        'list_entries',
        expect.stringContaining('List food entries'),
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpInstance.server.tool).toHaveBeenCalledWith(
        'add_entry',
        expect.stringContaining('Add a new food entry'),
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpInstance.server.tool).toHaveBeenCalledWith(
        'update_entry',
        expect.stringContaining('Update an existing food entry'),
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpInstance.server.tool).toHaveBeenCalledWith(
        'delete_entry',
        expect.stringContaining('Delete a food entry'),
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpInstance.server.tool).toHaveBeenCalledWith(
        'register_user',
        expect.stringContaining('Register a new user'),
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpInstance.server.tool).toHaveBeenCalledWith(
        'revoke_user',
        expect.stringContaining('Revoke a user'),
        expect.any(Object),
        expect.any(Function)
      );

      // Should have registered 6 tools
      expect(mcpInstance.server.tool).toHaveBeenCalledTimes(6);
    });

    it('should configure list_entries tool with correct schema', async () => {
      await mcpInstance.init();

      const listEntriesCall = vi
        .mocked(mcpInstance.server.tool)
        .mock.calls.find((call) => call[0] === 'list_entries');

      expect(listEntriesCall).toBeDefined();
      const [, , schema] = listEntriesCall!;

      expect(schema).toHaveProperty('date');
      expect(schema).toHaveProperty('limit');
      expect(schema).toHaveProperty('offset');
    });

    it('should configure add_entry tool with correct schema', async () => {
      await mcpInstance.init();

      const addEntryCall = vi
        .mocked(mcpInstance.server.tool)
        .mock.calls.find((call) => call[0] === 'add_entry');

      expect(addEntryCall).toBeDefined();
      const [, , schema] = addEntryCall!;

      expect(schema).toHaveProperty('food_name');
      expect(schema).toHaveProperty('calories');
      expect(schema).toHaveProperty('protein_g');
      expect(schema).toHaveProperty('carbs_g');
      expect(schema).toHaveProperty('fat_g');
      expect(schema).toHaveProperty('meal_type');
      expect(schema).toHaveProperty('entry_date');
    });
  });

  describe('tool handlers integration', () => {
    beforeEach(async () => {
      await mcpInstance.init();
      mcpInstance.props = { userId: 'test-user', isAdmin: false };
      // @ts-ignore - Accessing protected property in test
      mcpInstance.env = { DB: {}, MCP_OBJECT: {} };
    });

    it('should call listEntriesHandler with correct parameters', async () => {
      const { listEntriesHandler } = await import('./tools/index.js');

      // Get the handler function from the tool registration
      const listEntriesCall = vi
        .mocked(mcpInstance.server.tool)
        .mock.calls.find((call) => call[0] === 'list_entries');
      const handler = listEntriesCall![3] as unknown as Function;

      const params = { date: '2024-01-01', limit: 5 };
      await handler(params);

      expect(listEntriesHandler).toHaveBeenCalledWith(
        params,
        'test-user',
        { DB: {}, MCP_OBJECT: {} }
      );
    });

    it('should call addEntryHandler with correct parameters', async () => {
      const { addEntryHandler } = await import('./tools/index.js');

      const addEntryCall = vi
        .mocked(mcpInstance.server.tool)
        .mock.calls.find((call) => call[0] === 'add_entry');
      const handler = addEntryCall![3] as unknown as Function;

      const params = { food_name: 'Apple', calories: 80 };
      await handler(params);

      expect(addEntryHandler).toHaveBeenCalledWith(
        params,
        'test-user',
        { DB: {}, MCP_OBJECT: {} }
      );
    });

    it('should call admin handlers with correct admin flag', async () => {
      const { registerUserHandler } = await import('./tools/index.js');

      // Set admin props
      mcpInstance.props = { userId: 'admin-user', isAdmin: true };

      const registerUserCall = vi
        .mocked(mcpInstance.server.tool)
        .mock.calls.find((call) => call[0] === 'register_user');
      const handler = registerUserCall![3] as unknown as Function;

      const params = { name: 'John Doe', email: 'john@example.com' };
      await handler(params);

      expect(registerUserHandler).toHaveBeenCalledWith(
        params,
        'admin-user',
        { DB: {}, MCP_OBJECT: {} },
        true
      );
    });
  });
});
