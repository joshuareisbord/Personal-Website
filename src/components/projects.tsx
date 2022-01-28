import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import SECTIONS from '../constants/sections';
import { Project } from '../types/projects';

import { firestore } from '../util/firebase';
import generateRandomString from '../util/generateRandomString';

const ProjectElement: React.FC<{ project: Project, img: string }> = ({ project, img }) => {

    return (
        <div className="relative mb-4 w-full md:w-1/2 lg:w-1/3 px-4 hover:scale-105">
            <div className="relative h-80 mb-5 mx-auto rounded-lg">
                <img className="h-80 w-full relative rounded-lg object-cover" src={img} alt="" />
                <div className="absolute inset-0 bg-green-600 opacity-75 rounded-lg"></div>
                <div className="absolute inset-0 p-6 flex flex-col items-start">
                    <p className=" mb-1 text-2xl lg:text-2xl text-white font-bold">{project.name}</p>
                    <p className="mb-auto text-sm lg:text-1xl text-white font-bold">{project.desc}</p>
                    <a className="inline-block py-2 px-4 border-2 border-green-500 hover:border-white bg-transparent text-gray-50 hover:bg-white hover:text-gray-900 transition duration-200 rounded-l-xl rounded-t-xl font-bold leading-loose" href={project.link}>View Project</a>
                </div>
            </div>
        </div>
    );



}

export const Projects: React.FC = () => {


    const [projects, setProjects] = useState<null | Project[]>(null)

    useEffect(() => {

        const getProjects = async () => {

            const projectsRef = collection(firestore, 'projects');
            const projectsQuery = query(projectsRef, orderBy('priority'))
            const projectsSnap = await getDocs(projectsQuery)

            if (!projectsSnap.size) {
                console.error('no projects!')
            }

            let tmp: any[] = []
            projectsSnap.forEach(async (doc) => {
                const proj = doc.data() as Project
                const img = `https://source.unsplash.com/random/?code&sig=${Math.floor(Math.random() * 1000)}`
                tmp.push(<ProjectElement key={generateRandomString(5)} project={proj} img={img} />)
            });

            setProjects(tmp)

        }

        getProjects()

    }, [])

    return (
        <section className="flex flex-col content-center relative py-20 bg-gray-900 radius-for-skewed min-h-screen" id={SECTIONS.PROJECTS}>
            <div className="m-auto container px-4 mx-auto">
                <div className="mb-16 flex flex-wrap justify-center md:justify-between items-center">
                    <div className="text-center lg:text-left">
                        <span className="text-green-600 font-bold">What have I been working on?</span>
                        <h2 className="text-4xl lg:text-5xl font-bold font-heading text-white">Noteable Projects</h2>
                    </div>
                    <a className="hidden md:inline-block py-2 px-6 rounded-l-xl rounded-t-xl bg-green-600 hover:bg-green-700 text-gray-50 font-bold leading-loose transition duration-200" href="https://github.com/joshuareisbord">View More Projects</a>
                </div>
                <div className="flex flex-wrap -mx-4 mb-4">

                    {

                        projects ?

                            projects
                            :
                            <div>loading...</div>

                    }
                </div>
                <div className="max-w-screen py-10 mx-auto lg:mx-0 text-center">
                    <div>
                        <a className="md:hidden inline-block mb-3 lg:mb-0 lg:mr-3 w-2/3 lg:w-1/3 py-2 px-6 leading-loose bg-green-600 hover:bg-green-700 text-white font-semibold rounded-l-xl rounded-t-xl transition duration-200" href="https://github.com/joshuareisbord">View More Projects</a>
                        <a className="          inline-block mb-3 lg:mb-0 lg:mr-3 w-2/3 lg:w-1/3 py-2 px-6 leading-loose text-white font-semibold bg-gray-900 border-2 border-gray-700 hover:border-gray-600 rounded-l-xl rounded-t-xl transition duration-200" href={`#${SECTIONS.CONTACT}`}>Contact</a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Projects
