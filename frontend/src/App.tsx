import { useState, useEffect } from 'react'

const API_BASE = 'http://127.0.0.1:5199'

interface TodoItem {
  id: number
  title: string
  isCompleted: boolean
  createdAt: string
}

function App() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/hello`)
      .then((r) => r.json())
      .then((data) => setMessage(data.message))
  }, [])

  const loadTodos = () =>
    fetch(`${API_BASE}/api/todos`)
      .then((r) => r.json())
      .then(setTodos)

  useEffect(() => { loadTodos() }, [])

  const addTodo = async () => {
    if (!newTitle.trim()) return
    await fetch(`${API_BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    setNewTitle('')
    loadTodos()
  }

  const toggleTodo = async (id: number, current: boolean) => {
    await fetch(`${API_BASE}/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !current }),
    })
    loadTodos()
  }

  const deleteTodo = async (id: number) => {
    await fetch(`${API_BASE}/api/todos/${id}`, { method: 'DELETE' })
    loadTodos()
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h1>Tauri + .NET + React</h1>
      <p style={{ color: '#666' }}>{message}</p>

      <p style={{ fontSize: '0.85rem', color: '#999' }}>
        Database encrypted with SQLCipher — set <code>DB_PASSWORD</code> env var
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="New todo..."
          style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
        />
        <button onClick={addTodo} style={{ padding: '6px 16px' }}>Add</button>
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
              onChange={() => toggleTodo(todo.id, todo.isCompleted)}
            />
            <span style={{ flex: 1, textDecoration: todo.isCompleted ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>
              ✕
            </button>
          </li>
        ))}
        {todos.length === 0 && <li style={{ color: '#999' }}>No todos yet</li>}
      </ul>
    </div>
  )
}

export default App
