import React from 'react';

const getStrength = (password) => {
    let score = 0;
    if (!password) return { score: 0, label: '', color: '' };
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

    const levels = [
        { label: '', color: '', bg: 'bg-gray-200' },
        { label: 'Very Weak', color: 'text-red-600', bg: 'bg-red-500' },
        { label: 'Weak', color: 'text-orange-600', bg: 'bg-orange-500' },
        { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-500' },
        { label: 'Strong', color: 'text-blue-600', bg: 'bg-blue-500' },
        { label: 'Very Strong', color: 'text-green-600', bg: 'bg-green-500' },
    ];
    return { score, ...levels[score] };
};

const PasswordStrengthMeter = ({ password }) => {
    const { score, label, color, bg } = getStrength(password);
    if (!password) return null;

    const rules = [
        { test: /.{8,}/, label: '8+ characters' },
        { test: /[A-Z]/, label: 'Uppercase letter' },
        { test: /[a-z]/, label: 'Lowercase letter' },
        { test: /[0-9]/, label: 'Number' },
        { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, label: 'Special character' },
    ];

    return (
        <div className="mt-2 space-y-2">
            {/* Strength bar */}
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                    <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${level <= score ? bg : 'bg-gray-200'
                            }`}
                    />
                ))}
            </div>
            {label && (
                <p className={`text-xs font-medium ${color}`}>{label}</p>
            )}
            {/* Rules checklist */}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {rules.map(({ test, label }) => (
                    <li key={label} className={`flex items-center gap-1 text-xs ${test.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                        <span>{test.test(password) ? '✓' : '○'}</span>
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PasswordStrengthMeter;
