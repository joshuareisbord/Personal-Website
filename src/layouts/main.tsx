
import Login from '../pages/login';

import Header from '../components/header';
import Home from '../pages/home';
import { useAuth } from '../context/authContext';

import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { ROUTES } from '../constants/routes';
import { Edit } from '../pages/edit';


export const Main = () => {

    const { currentUser } = useAuth()

    return (

        <div>

            {currentUser ? <Header /> : <div/>}

            <BrowserRouter>

                <Routes>

                    <Route path={ROUTES.login} element={
                        !currentUser ?
                            <Login />
                            :
                            <Navigate to={'/'} />
                    } />

                    {
                        !currentUser ?
                            <Route path={"/"} element={<Navigate to={'/login'} />} />
                            :
                            <Route path={"/"} element={<Home />} />
                    }

                    <Route path={ROUTES.edit} element={<Edit />}/>


                </Routes>

            </BrowserRouter>

        </div>
    );
};

export default Main;
