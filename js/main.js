if (false) // Just for vs code intellisense
{
    const THREE = require('three');
    const Physijs = require('physijs');
}

/*
Target
    physics
    health
    value
    particles on death

Cannon Ball
    physics
    destroy target on contact
    particles during flight / impact?

Ground
    physics
    destroy target on contact

Block
    physics

HealthyBlock
    physics
    health
    particles on death?

Cannon
    physics
    cannon controls
    particles on fire cannon?
*/

const GRAVITY = -30;
const GROUND_SIZE = 500;

const Textures =
{
    Dirt:   undefined,
    Bird:   undefined
};

let Font = undefined;

Physijs.scripts.worker = 'libs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

window.onload = loadResources;

function loadResources()
{
    // Set up loading manager
    let loader, manager = new THREE.LoadingManager();

    manager.onLoad = () =>
    {
        init();
    }

    manager.onProgress = (url, current, total) =>
    {
        console.log("loading", url, "\n", current, "/", total);
    }

    // Load textures
    loader = new THREE.TextureLoader(manager);

    loader.load("textures/DirtTexture.jpg", (texture) =>
    {
        let r = GROUND_SIZE >> 4;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(r, r);
        Textures.Dirt = texture;
    });

    loader.load("textures/BirdTexture.png", (texture) =>
    {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0.29, 0.1);
        Textures.Bird = texture;
    });

    // Load fonts
    loader = new THREE.FontLoader(manager);
    
    loader.load("fonts/Input_Bold.json", (font) =>
    {
        Font = font;
    });
}

function init()
{
    setupDirections();

    let scene = createScene();
    let camera = createCamera(scene);
    let renderer = createRenderer(scene);

    setupLights(scene);

    // Systems
    SystemFactory.createCannonControlSystem(scene);
    SystemFactory.createHealthSystem();
    SystemFactory.createScoreSystem();
    SystemFactory.createCleanerSystem();

    // Entities
    let ground = EntityFactory.createGround(scene, 0, 0, 0, GROUND_SIZE, GROUND_SIZE,
        { modifier: 2, material: { map: Textures.Dirt } });
    let cannon = EntityFactory.createCannon(scene, 0, 2, camera.position.z - 3, 1.1, 12,
        Key.D, Key.A, Key.W, Key.S, Key.SPACE, { material: { color: 'grey', specular: 'grey' } });

    spawnTargets(scene);

    // Adjust camera and renderer if window changes size
    window.addEventListener("resize", 
    function()
    {
        var w = window.innerWidth;
        var h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    },
    false);

    let step = function()
    {
        requestAnimationFrame(step);

        scene.simulate();
        ECS.System.updateAll();
        renderer.render(scene, camera);
    }

    step();
}

function createScene()
{
    let scene = new Physijs.Scene();
    scene.background = new THREE.Color().setHSL(0.6, 0, 1);
    scene.fog = new THREE.Fog(scene.background, 0.1, 1000);
    scene.setGravity(0, 0, GRAVITY);

    // sky sphere
    let geo = new THREE.SphereGeometry(GROUND_SIZE, 32, 32);
    let mat = new THREE.MeshBasicMaterial({ color: 0x3399ff, side: THREE.BackSide });
    let sky = new THREE.Mesh(geo, mat);
    scene.add(sky);

    return scene;
}

function createCamera(scene)
{
    let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight);
    camera.position.set(0, 5, 66 >> 1);
    camera.lookAt(scene.position);

    return camera;
}

function createRenderer(scene)
{
    let renderer = new THREE.WebGLRenderer({antialias : true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(renderer.domElement);

    return renderer;
}

function setupLights(scene)
{
    let light, d = 200;

    light = new THREE.DirectionalLight(new THREE.Color().setHSL(0.1, 1, 0.95));
    light.position.set(-3, 10, -4).multiplyScalar(10);
    light.castShadow = true;
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.left = -d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000;
    scene.add(light);

    light = new THREE.DirectionalLight(new THREE.Color().setHSL(0.1, 1, 0.95), 0.3);
    light.position.set(-3, 10, 4).multiplyScalar(10);
    scene.add(light);

    light = new THREE.HemisphereLight(new THREE.Color().setHSL(0.6, 1, 0.6), new THREE.Color().setHSL(0.095, 1, 0.7), 0.6);
    light.position.set(0, 50, 0);
    scene.add(light);
}

function spawnTargets(scene)
{
    // Target 1
    EntityFactory.createBlock(scene, 0, 1, 0, 5, 2, 5);
    EntityFactory.createTarget(scene, 0, 4, 0, 2,
        { health: 125, material: { map: Textures.Bird } });

    // Target 2
    EntityFactory.createBlock(scene, 7, 5, -50, 5, 1, 5, { density: 0 });
    EntityFactory.createTarget(scene, 7, 7, -50, 1.5,
        { health: 100, value: 5, material: { map: Textures.Bird } });

    // Target 3
    EntityFactory.createBlock(scene, -50, 5, -200, 5, 1, 5, { density: 0 });
    EntityFactory.createTarget(scene, -50, 7, -200, 1.5,
        { health: 100, value: 20, material: { map: Textures.Bird } });

    // Target 4
    EntityFactory.createBlock(scene, -10, 3, 9, 0.5, 6, 0.5);
    EntityFactory.createTarget(scene, -10, 6.8, 9, 0.8,
        { health: 40, value: 10, material: { map: Textures.Bird } });
    EntityFactory.createBlock(scene, -9, 7.8, 12, 7, 7, 0.1,
        { health: 600, density: 0, material: { color: 'skyblue', transparent: true, opacity: 0.5 } });
    EntityFactory.createBlock(scene, -9, 1, 12, 7, 2, 0.1,
        { health: 600, density: 0, material: { color: 'skyblue', transparent: true, opacity: 0.5 } });

    // Put name in glass
    if (Font != undefined)
    {
        let name = new THREE.Mesh(
            new THREE.TextGeometry("Timothy", { font: Font, size: 1, height: 0.1 }),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
        );

        name.position.set(-12, 0.5, 12);

        scene.add(name);
    }

    // Target 5
    EntityFactory.createBlock(scene, 17, 3, -20, 1, 6, 1);
    EntityFactory.createBlock(scene, 17, 3, -28, 1, 6, 1);
    EntityFactory.createBlock(scene, 27, 3, -20, 1, 6, 1);
    EntityFactory.createBlock(scene, 27, 3, -28, 1, 6, 1);
    EntityFactory.createBlock(scene, 22, 6.25, -24, 12, 0.5, 10, { density: 3 });
    EntityFactory.createTarget(scene, 19, 7.5, -20, 1,
        { health: 1, value: 5, material: { map: Textures.Bird } });

    // Target 6
    EntityFactory.createBlock(scene, 17, 9.5, -20, 1, 6, 1);
    EntityFactory.createBlock(scene, 17, 9.5, -28, 1, 6, 1);
    EntityFactory.createBlock(scene, 27, 9.5, -20, 1, 6, 1);
    EntityFactory.createBlock(scene, 27, 9.5, -28, 1, 6, 1);
    EntityFactory.createBlock(scene, 22, 12.75, -24, 12, 0.5, 10, { density: 3 });
    EntityFactory.createTarget(scene, 25, 14, -27, 1,
        { health: 20, value: 5, material: { map: Textures.Bird } });
}

function setupDirections()
{
    // Directions
    let hud = document.createElement("div");
    hud.id = "Directions";
    hud.style =
    "\
        pointer-events: none; \
        position: absolute; \
        top: 10px; \
        left: 10px; \
        margin: 0; \
        padding: 0; \
        color: #FFFFFF; \
        z-index: 100; \
        display: block; \
        text-shadow: -1px -1px 0 1px -1px 0 -1px 1px 0 1px 1px 0; \
        font-family: input, courier, arial;\
        font-size: 12px; \
        font-weight: bold; \
        \
    ";

    let div;

    div = document.createElement("div");
    div.textContent = "Shoot: SPACE";
    hud.appendChild(div);

    div = document.createElement("div");
    div.textContent = "Aim: AWSD";
    hud.appendChild(div);


    document.body.appendChild(hud);
}