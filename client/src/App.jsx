import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Quizpage from './pages/Quizpage';
import Dashboard from './pages/Dashboard';
import Modal from './pages/modal';
import Table from './pages/Table';
import Sidebar from './pages/Sidebar';
import Confettii from './pages/confettii'
import CustomSnackbar from './pages/CustomSnackbar';
import './App.css'
// import Register from './pages/Register';
// import Login from './pages/Login';
// import Homepage from './pages/Homepage';
import Login from './pages/Login'
import Register from './pages/Register'
const App = () => {
  return (
    <Router>
      <Routes>
      <Route path='/' element={<Dashboard />} />
        <Route path='/test' element={<Quizpage />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/modal' element={<Modal />} />
        <Route path='/table' element={<Table />} />
        <Route path='/sidebar' element={<Sidebar />} />
        <Route path='/login' element={<Login />} />
        <Route path='/Register' element={<Register />} />
        <Route path='/confetti' element={<Confettii />} />
        <Route path='/customsnackbar' element={<CustomSnackbar />} />
        {/* <Route path='/register' element={<Register />} />
        <Route path='/login' element={<Login />} />
        <Route path='/home' element={<Homepage />} />
        <Route path='/' element={<Homepage />} /> */}

      </Routes>
    </Router>
  );
}

export default App; 