import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Catalog } from './pages/Catalog';
import { Detail } from './pages/Detail';
import { Read } from './pages/Read';
import { Shelf } from './pages/Shelf';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/detail" element={<Detail />} />
          <Route path="/read" element={<Read />} />
          <Route path="/shelf" element={<Shelf />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
