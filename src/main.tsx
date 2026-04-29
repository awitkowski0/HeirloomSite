import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react";
import './index.css'
import App from './App.tsx'

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("VITE_CONVEX_URL is not defined. Please add it to your environment variables.");
}
// Remove trailing slash if present
const normalizedUrl = convexUrl?.endsWith('/') ? convexUrl.slice(0, -1) : convexUrl;
const convex = new ConvexReactClient(normalizedUrl as string);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)
