import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    in: {
        opacity: 1,
        y: 0,
    },
    out: {
        opacity: 0,
        y: -10,
    },
};

const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3,
};

const PageTransition = ({ children, transitionKey }) => {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={transitionKey}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="h-full w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default PageTransition;
