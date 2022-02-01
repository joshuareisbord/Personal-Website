import { assert } from 'console';
import React from 'react';
import { useAuth } from '../context/authContext';

import Break from './break';

export const Header = () => {

    const { logout, currentUser } = useAuth()

    const LogOut: React.FC = () => {
        return (
            <div>
                <a
                    className="
                           inline-block 
                           py-2 px-4 
                           border-2
                           border-green-500 
                           bg-transparent 
                           text-gray-50
                           hover:border-white 
                           hover:bg-white 
                           hover:text-gray-900 
                           transition duration-200 
                           rounded-l-xl 
                           rounded-t-xl 
                           font-bold
                           leading-loose
                           "
                    onClick={() => logout()}
                >
                    Logout
                </a>
            </div>
        )
    }

    return (

        <div>
            <div className="flex flex-row bg-gray-900 h-auto px-3 py-5">

                <div className="flex flex-grow content-center items-center">
                    <h3 className="font-bold">
                        <span className="text-white">CMS</span>
                    </h3>
                </div>

                <div>
                    <LogOut />
                </div>

            </div>
            <Break />
        </div>
    );
};

export default Header;