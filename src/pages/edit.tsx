import React, { useEffect, useState } from 'react';

import { useNavigate, useSearchParams } from "react-router-dom";

import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore'

import { firestore } from '../util/firebase';
import { Project } from '../types/projects';
import generateRandomString from '../util/generateRandomString';

export const Edit = () => {

    const [searchParams] = useSearchParams();
    const [project, setProject] = useState<null | Project>(null)

    const navigate = useNavigate()

    useEffect(() => {

        const getData = async () => {
            const docRef = doc(firestore, `projects/${searchParams.get('docId')}`)
            const docSnap = await getDoc(docRef)
            const data = docSnap.data() as Project
            data.id = docSnap.id

            setProject(data)
        }

        if (searchParams.get('new') === 'true') {
            const data: Project = {
                desc: '',
                link: '',
                name: '',
                id: '',
            }
            setProject(data)
        }

        else {
            getData()
        }


    }, [])

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const field = event.target.name
        const data = event.target.value

        if (!project) {
            console.error('project not set!')
            return
        }

        // this is really bad code... idk why i cant access an attribute using my field variable.
        const newProject = project
        if (field === 'name') {
            newProject.name = data
        }
        else if (field === 'link') {
            newProject.link = data
        }
        else if (field === 'desc') {
            newProject.desc = data
        }

        setProject(newProject)

    }

    const doSubmit = async () => {

        if (!searchParams.get('docId')) {
            await addDoc(collection(firestore, 'projects'), project)
            navigate(-1)
        }
        else {
            const docRef = doc(firestore, `projects/${project?.id}`)
            await setDoc(docRef, project, { merge: true })
            navigate(-1)
        }

    }

    const EditMenu: React.FC = () => {
        return (
            <div className="flex flex-col content-center justify-center items-center w-3/4">
                <div className="container bg-gray-400 mx-auto px-4 py-6 rounded-lg">

                    <div className="mb-6">
                        <label className="block text-gray-800 text-sm font-semibold mb-2">Name</label>
                        <input className="appearance-none w-full p-4 text-xs font-semibold leading-none bg-gray-50 rounded outline-none"
                            type="text" name="name"
                            placeholder={project?.name}
                            defaultValue={project?.name}
                            onChange={handleChange} />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-800 text-sm font-semibold mb-2">Link</label>
                        <input className="appearance-none w-full p-4 text-xs font-semibold leading-none bg-gray-50 rounded outline-none"
                            type="text"
                            name="link"
                            placeholder={project?.link}
                            defaultValue={project?.link}
                            onChange={handleChange} />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-800 text-sm font-semibold mb-2">Description</label>
                        <textarea
                            className="appearance-none w-full p-4 text-xs font-semibold leading-none bg-gray-50 rounded outline-none"
                            name="desc"
                            placeholder={project?.desc}
                            defaultValue={project?.desc}
                            onChange={handleChange} />
                    </div>

                    <button className="inline-block py-2 px-6 leading-loose bg-green-600 hover:bg-green-700 text-white font-semibold rounded-l-xl rounded-t-xl transition duration-200"
                        type="submit"
                        control-id="ControlID-12"
                        onClick={doSubmit}
                    >
                        Submit
                    </button>

                </div>
            </div>
        );
    }

    return (

        <div className="flex flex-row justify-center content-center bg-gray-900 min-h-screen">

            {
                !project ?

                    <div className="flex flex-col content-center justify-center items-center">
                        <h3 className="text-6xl font-bold animate-pulse">
                            <span className="text-white">Loading</span>
                        </h3>
                    </div>
                    :
                    <EditMenu />
            }

        </div>
    );
};