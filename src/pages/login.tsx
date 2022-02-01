import React from 'react';
import { useAuth } from '../context/authContext';

import LOGO from '../img/google-logo.png'

const Login: React.FC = () => {

    const { signInWithGoogle } = useAuth()

    return (
        <div className="flex flex-col justify-center content-center bg-gray-800 h-screen">
          <div className="max-w-xl mx-auto">
            
            <div className="mb-6 lg:mb-10 p-6 lg:p-12 bg-gray-900 shadow-md rounded">
              <div className="mb-6">
                <h3 className="text-center text-2xl font-bold text-green-600">Sign In</h3>
              </div>
                
                <div className="text-center">
                  
                  <a className="p-4 flex justify-center items-center border rounded hover:bg-gray-800 hover:border-green-600" onClick={() => signInWithGoogle()}>
                    <img className="mr-4" src={LOGO} alt=""/>
                    <span className="text-xs text-gray-500 font-bold">Sign In with Google</span>
                  </a>
                </div>
            </div>
          </div>
        </div>
    );
};

export default Login;
