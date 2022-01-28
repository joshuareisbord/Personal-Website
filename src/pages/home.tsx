import About from '../components/about';
import Contact from '../components/contact';
import Header from '../components/header';
import Projects from '../components/projects';

import Break from '../components/break';

import { useEffect, useState } from 'react';

export const Home: React.FC = () => {

    const [buttonVisable, setButtonVisable] = useState(false)

    const ScrollToTop: React.FC = () => {

        return (
            <div className="fixed z-30 bottom-0 right-0 mr-5 mb-5">
                    <button onClick={() => window.scrollTo(0,0)} className="flex justify-center items-center border-4 rounded-full border-green-600 hover:border-green-700 h-10 w-10">
                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" className="h-3/4 w-3/4 hover:animate-ping">
                            <path className="fill-green-600" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"></path>
                        </svg>
                    </button>
            </div>
        );
    };

    const onScroll = () => {
        const threshold = window.innerHeight / 2

        if (window.scrollY < threshold) {
            setButtonVisable(false)
        }
        else {
            setButtonVisable(true)
        }
    }

    useEffect(() => {
        window.addEventListener('scroll', onScroll)
    }, [])

    return (
        <div>
            <Header />
            <Break />
            <About />
            <Break />
            <Projects />
            <Break />
            <Contact />
            <Break />
            {
                buttonVisable ?
                    <ScrollToTop />
                    :
                    <div />
            }
        </div>
    );
};

export default Home;
