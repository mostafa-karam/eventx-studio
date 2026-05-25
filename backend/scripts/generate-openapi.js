const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const INDEX_FILE = path.join(ROUTES_DIR, 'index.js');
const OUT_FILE = path.join(__dirname, '..', 'swagger-output.json');

const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

function readIndexMappings() {
    const src = fs.readFileSync(INDEX_FILE, 'utf8');
    // map var name -> required path
    const requireRegex = /const\s+(\w+)\s*=\s*require\(['"](.\/\w+)['"]\);/g;
    const varToFile = {};
    let m;
    while ((m = requireRegex.exec(src))) {
        varToFile[m[1]] = m[2];
    }

    // map required path -> mount path from router.use
    const useRegex = /router\.use\(['"]([\w\/:-]+)['"],\s*(\w+)\);/g;
    const fileToMount = {};
    while ((m = useRegex.exec(src))) {
        const mount = m[1];
        const varName = m[2];
        const file = varToFile[varName];
        if (file) fileToMount[file] = mount;
    }
    return fileToMount;
}

function extractRoutesFromFile(filePath) {
    const src = fs.readFileSync(filePath, 'utf8');
    const routes = [];
    const routerCallRegex = new RegExp(`router\\.(${methods.join('|')})\\(\\s*['\"]([^'\"]+)['\"]`, 'g');
    let m;
    while ((m = routerCallRegex.exec(src))) {
        routes.push({ method: m[1].toLowerCase(), path: m[2] });
    }
    return routes;
}

function toTitleCaseTag(segment) {
    return segment
        .split('-')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function deriveTagName(mount, fallback) {
    const segments = mount.replace(/^\//, '').split('/').filter(Boolean);
    const tagSegment = [...segments].reverse().find(segment => !segment.startsWith(':')) || fallback;
    return toTitleCaseTag(tagSegment);
}

function toOpenApiPath(expressPath) {
    return expressPath.replace(/(^|\/):([A-Za-z_][A-Za-z0-9_]*)/g, '$1{$2}');
}

function buildSpec() {
    const fileToMount = readIndexMappings();
    const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js') && f !== 'index.js');

    const spec = {
        openapi: '3.0.3',
        info: { title: 'EventX Studio API (auto-generated)', version: '2.0.0' },
        paths: {},
        components: {},
        tags: [],
    };

    for (const file of files) {
        const fullPath = path.join(ROUTES_DIR, file);
        const relRequire = './' + path.basename(file, '.js');
        const mount = fileToMount[relRequire] || '/' + path.basename(file, '.js');
        const tagName = deriveTagName(mount, path.basename(file, '.js'));
        spec.tags.push({ name: tagName });

        const routes = extractRoutesFromFile(fullPath);
        for (const r of routes) {
            // combine mount and route.path
            let routePath = r.path === '/' ? '' : r.path;
            let combined = path.posix.join(mount, routePath);
            if (!combined.startsWith('/')) combined = '/' + combined;
            combined = toOpenApiPath(combined);
            if (!spec.paths[combined]) spec.paths[combined] = {};
            spec.paths[combined][r.method] = {
                summary: `Auto-generated ${r.method.toUpperCase()} ${combined}`,
                tags: [tagName],
                responses: { '200': { description: 'OK' } },
            };
        }
    }

    // de-duplicate tags
    spec.tags = Array.from(new Map(spec.tags.map(t => [t.name, t])).values());
    return spec;
}

function main() {
    try {
        const spec = buildSpec();
        fs.writeFileSync(OUT_FILE, JSON.stringify(spec, null, 2), 'utf8');
        console.log('Wrote', OUT_FILE);
    } catch (err) {
        console.error('Error generating OpenAPI spec:', err);
        process.exit(1);
    }
}

main();
