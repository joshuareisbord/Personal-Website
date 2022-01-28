import About from '../components/about';
import Contact from '../components/contact';
import Header from '../components/header';
import Projects from '../components/projects';

export const Home: React.FC = () => {
  return (
      <div>
          <Header />
          <hr/>
          <About />
          <hr/>
          <Projects />
          <hr/>
          <Contact />
      </div>
  );
};

export default Home;