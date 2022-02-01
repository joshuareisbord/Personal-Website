import React from 'react';
import generateRandomString from '../util/generateRandomString';

const GreenBlock: React.FC = () => {
    
    const classes = [
        "w-1/3 py-1 bg-green-400",
        "w-1/3 py-1 bg-green-500",
        "w-1/3 py-1 bg-green-600",
    ]
    
    let tmp = []
    for (let i = 0; i < 3; i++) {
        var selected = classes[Math.floor(Math.random() * classes.length)];
        tmp.push(<div key={generateRandomString(5)} className={selected}></div>)
    }

    return (
        <div key={generateRandomString(5)} className="w-1/3 flex">
            {tmp}
        </div>
    );
}

export const Break = () => {
    return (
        <div className="flex w-full">
            <GreenBlock/>
            <GreenBlock/>
            <GreenBlock/>
        </div>
    );
};

export default Break;