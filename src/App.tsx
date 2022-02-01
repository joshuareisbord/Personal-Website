
import AuthContextProvider from './context/authContext';
import Main from './layouts/main';

export const App = () => {
    return (
        <div>
            <AuthContextProvider>
                <Main />
            </AuthContextProvider>
        </div>
    );
};


export default App;
