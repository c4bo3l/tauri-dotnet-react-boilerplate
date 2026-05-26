import { useState, useEffect } from 'react';
import { API_BASE } from './EnvironmentVariables';

interface TodoItem {
  id: number
  title: string
  isCompleted: boolean
  createdAt: string
}

function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void fetch(`${API_BASE}/api/hello`)
      .then((r) => r.json() as Promise<{ message: string }>)
      .then((data) => setMessage(data.message));
  }, []);

  const loadTodos = (): Promise<void> =>
    fetch(`${API_BASE}/api/todos`)
      .then((r) => r.json() as Promise<TodoItem[]>)
      .then((data) => { setTodos(data); });

  useEffect(() => { void loadTodos(); }, []);

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    await fetch(`${API_BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle('');
    await loadTodos();
  };

  const toggleTodo = async (id: number, current: boolean) => {
    await fetch(`${API_BASE}/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !current }),
    });
    await loadTodos();
  };

  const deleteTodo = async (id: number) => {
    await fetch(`${API_BASE}/api/todos/${id}`, { method: 'DELETE' });
    await loadTodos();
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h1>Tauri + .NET + React</h1>
      <p style={{ color: '#666' }}>{message}</p>

      <p style={{ fontSize: '0.85rem', color: '#999' }}>
        Database encrypted with SQLCipher — set in <code>appsettings.json</code>
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void addTodo(); }}
          placeholder="New todo..."
          style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
        />
        <button onClick={() => { void addTodo(); }} style={{ padding: '6px 16px' }}>Add</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <input
              type="checkbox"
              checked={todo.isCompleted}
              onChange={() => { void toggleTodo(todo.id, todo.isCompleted); }}
            />
            <span style={{ flex: 1, textDecoration: todo.isCompleted ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => { void deleteTodo(todo.id); }} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>
              ✕
            </button>
          </li>
        ))}
        {todos.length === 0 && <li style={{ color: '#999' }}>No todos yet</li>}
      </ul>
    </div>
  );
}

export default App;
