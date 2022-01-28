import React from 'react';

import SECTIONS from '../constants/sections';

export const Header: React.FC = () => {

    const TEXT = {
        F_NAME: 'Joshua',
        L_NAME: 'Reisbord',
        ABOUT_BLURB: 'Student passionate about creating new and innovative technologies used by people everyday.'
    }

    return (

        <section className="relative bg-gray-900 overflow-hidden" id={SECTIONS.HOME}>
            <div className="relative pt-12 lg:pt-20 pb-20 z-10">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap -mx-4">
                        <div className="w-full lg:w-1/2 px-4 mb-12 lg:mb-0 flex items-center">
                            <div className="w-full text-center lg:text-left">
                                <div className="max-w-md mx-auto lg:mx-0">
                                    <h2 className="mb-3 text-4xl lg:text-5xl text-white font-bold">
                                        <span>{TEXT.F_NAME}</span>
                                        <span className="text-green-600">{TEXT.L_NAME}</span>
                                    </h2>
                                </div>
                                <div className="max-w-sm mx-auto lg:mx-0">
                                    <p className="mb-6 text-gray-400 leading-loose">{TEXT.ABOUT_BLURB}</p>
                                    <div>
                                        {/* About and Projects Buttons */}
                                        <a className="inline-block mb-3 lg:mb-0 lg:mr-3 w-full lg:w-auto py-2 px-6 leading-loose bg-green-600 hover:bg-green-700 text-white font-semibold rounded-l-xl rounded-t-xl transition duration-200" href={`#${SECTIONS.ABOUT}`}>About Me</a>
                                        <a className="inline-block w-full lg:w-auto py-2 px-6 leading-loose text-white font-semibold bg-gray-900 border-2 border-gray-700 hover:border-gray-600 rounded-l-xl rounded-t-xl transition duration-200" href={`#${SECTIONS.PROJECTS}`}>Projects</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:w-1/2 px-4">
                            <div className="flex flex-wrap lg:mb-4 lg:ml-6">
                                <img className="w-full md:w-1/2 lg:w-1/3 h-64 p-2 object-cover rounded-4xl lg:rounded-br-none" src={`https://firebasestorage.googleapis.com/v0/b/personal-website-f17c6.appspot.com/o/Josh%20and%20Lena%20Versailles.jpeg?alt=media&token=3bcbc4eb-4ce0-433d-9512-ebc5e163c061`} alt="" />
                                <img className="w-full md:w-1/2 lg:w-2/3 h-64 p-2 object-cover rounded-4xl lg:rounded-bl-none" src={`https://firebasestorage.googleapis.com/v0/b/personal-website-f17c6.appspot.com/o/Hardy%20Island%202.JPG?alt=media&token=e0b79569-58fc-4633-af46-25dbd2edc188`} alt="" />
                            </div>
                            <div className="flex flex-wrap lg:mb-4 lg:mr-6">
                                <img className="w-full md:w-1/2 lg:w-2/3 h-64 p-2 object-cover rounded-4xl lg:rounded-br-none" src={`https://firebasestorage.googleapis.com/v0/b/personal-website-f17c6.appspot.com/o/Hardy%20Island%203.JPG?alt=media&token=00b25b67-bcd7-4122-8134-b024c172545b`} alt="" />
                                <img className="w-full md:w-1/2 lg:w-1/3 h-64 p-2 object-cover rounded-4xl lg:rounded-bl-none" src={`https://firebasestorage.googleapis.com/v0/b/personal-website-f17c6.appspot.com/o/Formal%20Headshot.JPG?alt=media&token=d706658c-a50b-4986-b6ef-9dcb65a53cad`} alt="" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    );
};

export default Header;
