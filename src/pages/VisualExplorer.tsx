import { Navigate } from 'react-router-dom'

// Visual Explorer maps to the same analytics page in the prototype
export default function VisualExplorer() {
  return <Navigate to="/analytics" replace />
}
