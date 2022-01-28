import React from 'react';

import GITHUB from '../assets/logos/github.png'
import LINKEDIN from '../assets/logos/linkedin.png'


export const Contact: React.FC = () => {

    const TEXT = {
        EMAIL: 'joshuareisbord@gmail.com',
        PHONE: '+1 (310) 351-1198'
    }

    return (
        <section>
            <div className="py-20 bg-gray-900 radius-for-skewed">
                <div className="container mx-auto px-4">
                    <div className="mb-16 max-w-md mx-auto text-center">
                        <h2 className="text-4xl lg:text-5xl font-bold font-heading text-white">Contact</h2>
                        <p className="text-gray-500">Got any question? Want to see more?</p>
                    </div>
                    <div className="flex flex-wrap -mx-4">
                        <div className="mb-8 lg:mb-0 w-full lg:w-1/2 px-4">
                            <div className="py-12 lg:py-20 rounded bg-gray-800 shadow-md text-center">
                                <h3 className="mb-8 lg:mb-20 text-3xl font-bold font-heading text-white">Contacts</h3>
                                <p className="text-gray-400">{TEXT.EMAIL}</p>
                                <p className="text-gray-400">{TEXT.PHONE}</p>
                            </div>
                        </div>
                        <div className="w-full lg:w-1/2 px-4 flex items-stretch">
                            <div className="py-12 lg:py-20 w-full rounded bg-gray-800 shadow-md text-center">
                                <h3 className="mb-8 lg:mb-20 text-3xl font-bold font-heading text-white">Socials</h3>
                                <div className="flex justify-center">
                                    <a className="mr-3" href="#">
                                        <img className="w-auto h-8" src={GITHUB} alt="" />
                                    </a>
                                    <a href="#">
                                        <img className="w-auto h-8" src={LINKEDIN} alt="" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
