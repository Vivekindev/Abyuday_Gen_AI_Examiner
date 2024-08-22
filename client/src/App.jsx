import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Quizpage from './pages/Quizpage';
import Dashboard from './pages/Dashboard';
import Modal from './pages/modal';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './auth/ProtectedRoute';
import Sidebar from './pages/Sidebar';
import NotFound from './pages/NotFount';
import './App.css'
const App = () => {
  return (
    <Router>
      <Routes>
     
      <Route path='/register' element={<Register />} />
      <Route path='/login' element={<Login />} />
      
      <Route element={<ProtectedRoute/>}>
           <Route path='/dashboard' element={<Sidebar />} />
           <Route path='/modal' element={<Modal />} />
           <Route path='/test' element={<Dashboard />}/>
      </Route>
     
       
      <Route path='*' element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App; 