import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </BrowserRouter>
  )
}