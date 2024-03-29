import React from 'react';

import GITHUB from '../assets/logos/github.png'
import LINKEDIN from '../assets/logos/linkedin.png'

import SECTIONS from '../constants/sections';


export const Contact: React.FC = () => {

    const TEXT = {
        EMAIL: 'joshuareisbord@gmail.com',
        PHONE: '+1 (310) 351-1198'
    }

    return (
        <section className="flex flex-col content-center relative py-20 bg-gray-900 radius-for-skewed h-screen" id={SECTIONS.CONTACT}>
                <div className="m-auto relative container px-4 mx-auto">
                    <div className="mb-16 max-w-md mx-auto text-center">
                        <h2 className="text-4xl lg:text-5xl font-bold font-heading text-white">Contact</h2>
                        <p className="text-gray-500">Got any question? Want to see more?</p>
                    </div>
                    <div className="flex flex-wrap -mx-4">
                        <div className="mb-8 lg:mb-0 w-full lg:w-1/2 px-4">
                            <div className="py-12 lg:py-20 rounded bg-gray-800 shadow-md text-center">
                                <h3 className="mb-5 lg:mb-10 text-3xl font-bold font-heading text-white">Contacts</h3>
                                <a href={`mailto: ${TEXT.EMAIL}`}><p className="text-gray-400 hover:text-green-400">{TEXT.EMAIL}</p></a>
                                <a href="tel: +13103511198"><p className="text-gray-400 hover:text-green-400">{TEXT.PHONE}</p></a>
                            </div>
                        </div>
                        <div className="w-full lg:w-1/2 px-4 flex items-stretch">
                            <div className="py-12 lg:py-20 w-full rounded bg-gray-800 shadow-md text-center">
                                <h3 className="mb-5 lg:mb-10 text-3xl font-bold font-heading text-white">Socials</h3>
                                <div className="flex justify-center">
                                    <a className="mr-3" href="https://github.com/joshuareisbord" target="_blank" rel="noopener noreferrer">
                                        <img className="w-auto h-8 hover:scale-125" src={GITHUB} alt="" />
                                    </a>
                                    <a href="https://www.linkedin.com/in/joshuareisbord/" target="_blank" rel="noopener noreferrer">
                                        <img className="w-auto h-8 hover:scale-125" src={LINKEDIN} alt="" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </section>
    );
};

export default Contact;
