import React from 'react';
import { ChevronRight, Home } from 'lucide-react';


const Breadcrumbs = ({ items }) => {
    return (
        <nav className="flex items-center text-sm text-gray-500 mb-6">
            <div className="flex items-center hover:text-gray-900 cursor-pointer transition-colors">
                <Home className="w-4 h-4 mr-1" />
                <span>Home</span>
            </div>

            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                    {item.onClick ? (
                        <span
                            onClick={item.onClick}
                            className="hover:text-gray-900 cursor-pointer transition-colors"
                        >
                            {item.label}
                        </span>
                    ) : (
                        <span className="text-gray-900 font-medium">
                            {item.label}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
