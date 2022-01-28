import React from 'react';

import SECTIONS from '../constants/sections';

export const About: React.FC = () => {

    const TEXT = {
        ABOUT_BLURB_0: `I am a fourth-year student at one of Canada's most prestigious universities, Queen's University,
                        pursuing a Bachelors's of Computer Science with an honors distinction (BCOMP. Honors).`,
        
        ABOUT_BLURB_1: `My love for development started at a young age when I would make websites 
                        about Club Penguin items and where to get them. This snowballed into modifying 
                        maps in Halo 3 and hosting Minecraft servers using a popular utility at the time, 
                        Bukkit, to enable plugin usage. Through this, I learned the extreme basics of server 
                        administration, Java development, and the Linux command line`,
        
        ABOUT_BLURB_2: `When I first entered university, I was unsure exactly what I wanted to do. I was scared 
                        off by the idea of computer science because I thought I did not have what it took, so I 
                        pursued a degree in economics. I quickly found that path was not for me, so I did what I 
                        should have done from the start, pursued computer science. The rest is history, and I 
                        have not looked back since.`
    }

    return (
        <section className="py-20 bg-gray-900" id={SECTIONS.ABOUT}>
            <div className="container mx-auto px-4">
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
            </div>
        </section>
    );
};


export default About;