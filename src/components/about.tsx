import React from 'react';

import SECTIONS from '../constants/sections';

export const About: React.FC = () => {

    const TEXT = {



        ABOUT_BLURB_0: `My name is Joshua Reisbord, a dedicated Software Engineer holding a Bachelor of Computing, 
                        Computer Science (BCOMP Honors) from Queen's University in Kingston, Ontario. 
                        Throughout my academic and professional journey, I have honed my skills in various programming 
                        languages and technologies.`,

        ABOUT_BLURB_1: `My passion for programming took root at a young age when I began creating websites featuring 
                        Club Penguin items and their locations. This enthusiasm grew as I started modifying maps in 
                        Halo 3 and hosting Minecraft servers using the popular Bukkit utility, which enabled plugin usage. 
                        These experiences allowed me to acquire foundational knowledge in server administration, 
                        object oriented programing, and the Linux command line, setting the stage for my future pursuits in 
                        software engineering.`,

        ABOUT_BLURB_2: `As a developer, my passion lies in designing and developing innovative 
                        applications that cater to specific niches and make the daily lives of users more manageable and 
                        enjoyable. I invite you to browse through some of my notable projects featured in the projects section, 
                        which showcase my expertise and commitment to delivering high-quality software solutions.`
    }

    return (
        <section className="flex flex-col content-center relative py-20 bg-gray-900 min-h-screen" id={SECTIONS.ABOUT}>
            <div className="m-auto relative container mx-auto px-4">
                <div className="flex flex-wrap items-center -mx-4">
                    <div className="w-full lg:w-full px-4 mb-8 lg:mb-0">
                        <h2 className="text-4xl lg:text-5xl text-white font-bold font-heading">Who am I?</h2>
                        <br />
                        <p className="max-w-fit lg:text-2xl text-gray-400 leading-loose">{TEXT.ABOUT_BLURB_0}</p>
                        <br />
                        <p className="max-w-fit lg:text-2xl text-gray-400 leading-loose">{TEXT.ABOUT_BLURB_1}</p>
                        <br />
                        <p className="max-w-fit lg:text-2xl text-gray-400 leading-loose">{TEXT.ABOUT_BLURB_2}</p>
                    </div>
                </div>
                <div className="max-w-screen py-20 mx-auto lg:mx-0 text-center">
                    <div>
                        <a className="inline-block mb-3 lg:mb-0 lg:mr-3 w-2/3 lg:w-1/3 py-2 px-6 leading-loose bg-green-600 hover:bg-green-700 text-white font-semibold rounded-l-xl rounded-t-xl transition duration-200" href={`#${SECTIONS.PROJECTS}`}>Projects</a>
                        <a className="inline-block mb-3 lg:mb-0 lg:mr-3 w-2/3 lg:w-1/3 py-2 px-6 leading-loose text-white font-semibold bg-gray-900 border-2 border-gray-700 hover:border-gray-600 rounded-l-xl rounded-t-xl transition duration-200" href={`#${SECTIONS.CONTACT}`}>Contact</a>
                    </div>
                </div>
            </div>

        </section>
    );
};


export default About;