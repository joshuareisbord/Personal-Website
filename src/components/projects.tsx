import axios, { AxiosRequestConfig } from 'axios';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import SECTIONS from '../constants/sections';
import { Project } from '../types/projects';

import { firestore } from '../util/firebase';

const ProjectElement: React.FC<{project: Project, img: string}> = ({project, img}) => {

    

    // const img = 

    return (
        <div></div>
    );



}

export const Projects: React.FC = () => {


    const [ projects, setProjects ] = useState<null | Project[]> (null)

    useEffect(() => {

        const getProjects = async () => {

            const projectsRef = collection(firestore, 'projects');
            const projectsSnap = await getDocs(projectsRef)

            if (!projectsSnap.size){
                console.error('no projects!')
            }

            projectsSnap.forEach(async (doc) => {
                const { desc, link, name } = doc.data() as Project

                // const config: AxiosRequestConfig = {
                //     method: 'get',
                //     url: 'https://source.unsplash.com/random/?cliff',
                //     headers: { 
                //         'Cookie': 'ugid=90d1d7f67d3ed9477dfd4f6be5528ee15477784'
                //     },
                //     params: {
                //         sig: Math.floor(Math.random() * 1000)
                //     }
                // }

                // const response = await axios.request(config);
                // console.log(response)


                console.log(doc.data())
            })

        }

        getProjects()



    })

    return (
        <section id={SECTIONS.PROJECTS}>
            <div className="py-20 bg-gray-900 radius-for-skewed">
                <div className="container px-4 mx-auto">
                    <div className="mb-16 flex flex-wrap justify-center md:justify-between items-center">
                        <div className="text-center lg:text-left">
                            <span className="text-green-600 font-bold">What have I been working on?</span>
                            <h2 className="text-4xl lg:text-5xl font-bold font-heading text-white">Noteable Projects</h2>
                        </div>
                        <a className="hidden md:inline-block py-2 px-6 rounded-l-xl rounded-t-xl bg-green-600 hover:bg-green-700 text-gray-50 font-bold leading-loose transition duration-200" href="https://github.com/joshuareisbord">View More Projects</a>
                    </div>
                    <div className="flex flex-wrap -mx-4 mb-4">
                        <div className="w-full md:w-1/2 lg:w-1/3 mb-8 px-4">
                            <a href="#">
                                <img className="h-80 w-full mx-auto object-cover rounded" src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-1.2.1&amp;ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&amp;auto=format&amp;fit=crop&amp;w=1050&amp;q=80" alt="" />
                            </a>
                        </div>
                        <div className="relative mb-4 w-full md:w-1/2 lg:w-1/3 px-4">
                            <div className="relative h-80 mb-5 mx-auto rounded-lg">
                                <img className="h-80 w-full relative rounded-lg object-cover" src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&amp;ixlib=rb-1.2.1&amp;auto=format&amp;fit=crop&amp;w=1055&amp;q=80" alt="" />
                                <div className="absolute inset-0 bg-green-600 opacity-75 rounded-lg"></div>
                                <div className="absolute inset-0 p-6 flex flex-col items-start">
                                    <span className="text-green-400">2021</span>
                                    <p className="mb-auto text-xl lg:text-2xl text-white font-bold">Lorem ipsum dolor sit amet consectutar</p>
                                    <a className="inline-block py-2 px-4 border-2 border-green-500 hover:border-white bg-transparent text-gray-50 hover:bg-white hover:text-gray-900 transition duration-200 rounded-l-xl rounded-t-xl font-bold leading-loose" href="#">View Project</a>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 lg:w-1/3 mb-8 px-4">
                            <a href="#">
                                <img className="h-80 w-full mx-auto object-cover rounded" src="https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?ixlib=rb-1.2.1&amp;ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&amp;auto=format&amp;fit=crop&amp;w=968&amp;q=80" alt="" />
                            </a>
                        </div>
                        <div className="w-full md:w-1/2 lg:w-1/3 mb-8 px-4">
                            <a href="#">
                                <img className="h-80 w-full mx-auto object-cover rounded" src="https://images.unsplash.com/photo-1476610182048-b716b8518aae?ixlib=rb-1.2.1&amp;ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&amp;auto=format&amp;fit=crop&amp;w=1127&amp;q=80" alt="" />
                            </a>
                        </div>
                        <div className="w-full md:w-1/2 lg:w-1/3 mb-8 px-4">
                            <a href="#">
                                <img className="h-80 w-full mx-auto object-cover rounded" src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-1.2.1&amp;ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&amp;auto=format&amp;fit=crop&amp;w=1050&amp;q=80" alt="" />
                            </a>
                        </div>
                        <div className="w-full md:w-1/2 lg:w-1/3 mb-8 px-4">
                            <a href="#">
                                <img className="h-80 w-full mx-auto object-cover rounded" src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-1.2.1&amp;ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&amp;auto=format&amp;fit=crop&amp;w=1050&amp;q=80" alt="" />
                            </a>
                        </div>
                    </div>
                    <div className="text-center"><a className="md:hidden inline-block py-2 px-6 rounded-l-xl rounded-t-xl bg-green-600 hover:bg-green-700 text-gray-50 font-bold leading-loose transition duration-200" href="#">View More Projects</a></div>
                </div>
            </div>
        </section>
    );
};

export default Projects
