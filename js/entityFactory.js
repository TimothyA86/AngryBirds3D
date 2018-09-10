class EntityFactory
{
    /**
     * Create a target
     * @param {Physijs.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} z 
     * @param {Number} radius 
     * @param {{}} parameters
     */
    static createTarget(scene, x, y, z, radius, parameters = {})
    {
        let geo = new THREE.SphereGeometry(radius, 32, 32);
        let mat = Physijs.createMaterial(new THREE.MeshPhongMaterial(parameters.material), .9, .5);
        let density = parameters.density === undefined ? 1 : parameters.density;
        let mass = 4 / 3 * Math.PI * Math.pow(radius, 3) * density;
        
        let mesh = new Physijs.SphereMesh(geo, mat, mass);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh._physijs.collision_type = CollisionFlags.Target;
        mesh._physijs.collision_mask = CollisionFlags.All;

        scene.add(mesh);

        let health = parameters.health || 1;
        let value = parameters.value || 1;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Physics.type, Components.Physics.data("target", mesh))
            .addComponent(Components.Health.type, Components.Health.data(health))
            .addComponent(Components.Target.type, Components.Target.data(value))
            .build("target");

        entity.onDestroy = () =>
        {
            scene.remove(mesh);
            geo.dispose();
            mat.dispose();
        };

        return entity;
    }

    /**
     * Create a cannon
     * @param {Physijs.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} z 
     * @param {Number} bearingUp 
     * @param {Number} bearingDown 
     * @param {Number} elevationUp 
     * @param {Number} elevationDown 
     * @param {Number} fire 
     * @param {{}} parameters 
     */
    static createCannon(scene, x, y, z, radius, length, bearingUp, bearingDown, elevationUp, elevationDown, fire, parameters = {})
    {
        let geo = new THREE.CylinderGeometry(radius, radius, length, 32);
        let mat = Physijs.createMaterial(new THREE.MeshPhongMaterial(parameters.material), .8, 0.2);
        let density = parameters.density === undefined ? 1 : parameters.density;
        let mass =  Math.PI * Math.pow(radius, 2) * length * density;
        
        let mesh = new Physijs.CylinderMesh(geo, mat, mass);
        mesh.position.set(x, y, z);
        mesh.rotation.x = -Math.PI / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh._physijs.collision_type = CollisionFlags.Cannon;
        mesh._physijs.collision_mask = CollisionFlags.All & ~(CollisionFlags.CannonBall | CollisionFlags.Ground);

        scene.add(mesh);

        let constraint = new Physijs.DOFConstraint(mesh, undefined, new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z));

        scene.addConstraint(constraint);

        let limit = Infinity;
        constraint.setAngularLowerLimit(new THREE.Vector3(-limit, -limit, 0));
        constraint.setAngularUpperLimit(new THREE.Vector3(limit, limit, 0));

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Physics.type, Components.Physics.data("cannon", mesh))
            .addComponent(Components.DOFConstraint.type, Components.DOFConstraint.data(constraint))
            .addComponent(Components.CannonControls.type, Components.CannonControls.data(
                bearingUp, bearingDown, 0.5, 5, elevationUp, elevationDown, 0.5, 5, fire, length))
            .build("cannon");

        entity.onDestroy = () =>
        {
            scene.remove(mesh);
            geo.dispose();
            mat.dispose();
        };

        return entity;
    }

    /**
     * Create a cannon ball
     * @param {Physijs.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} z 
     * @param {Number} radius 
     * @param {THREE.Vector3} force 
     * @param {{}} parameters 
     */
    static createCannonBall(scene, x, y, z, radius, force, parameters = {})
    {
        let geo = new THREE.SphereGeometry(radius, 32, 32);
        let mat = Physijs.createMaterial(new THREE.MeshPhongMaterial(parameters.material), .9, .5);
        let density = parameters.density === undefined ? 1 : parameters.density;
        let mass =  4 / 3 * Math.PI * Math.pow(radius, 3) * density;
        
        let mesh = new Physijs.SphereMesh(geo, mat, mass);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh._physijs.collision_type = CollisionFlags.CannonBall;
        mesh._physijs.collision_mask = CollisionFlags.All & ~CollisionFlags.Cannon;

        scene.add(mesh);

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Physics.type, Components.Physics.data("cannonBall", mesh))
            .build("cannonBall");

        entity.onDestroy = () =>
        {
            scene.remove(mesh);
            geo.dispose();
            mat.dispose();
        };

        mesh.applyCentralImpulse(force);

        return entity;
    }

    /**
     * Create a block
     * @param {Physijs.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} z 
     * @param {Number} width 
     * @param {Number} height 
     * @param {Number} depth 
     * @param {{}} parameters
     */
    static createBlock(scene, x, y, z, width, height, depth, parameters = {})
    {
        let geo = new THREE.BoxGeometry(width, height, depth);
        let mat = Physijs.createMaterial(new THREE.MeshPhongMaterial(parameters.material), .8, .2);
        let density = parameters.density === undefined ? 1 : parameters.density;
        let mass =  width * height * depth * density;
        
        let mesh = new Physijs.BoxMesh(geo, mat, mass);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh._physijs.collision_type = CollisionFlags.Block;
        mesh._physijs.collision_mask = CollisionFlags.All;

        scene.add(mesh);

        let bp = ECS.Entity.createBlueprint()
            .addComponent(Components.Physics.type, Components.Physics.data("block", mesh))

        if (parameters.health !== undefined)
        {  
            bp.addComponent(Components.Health.type, Components.Health.data(parameters.health));
        }

        let entity = bp.build("block");

        entity.onDestroy = () =>
        {
            scene.remove(mesh);
            geo.dispose();
            mat.dispose();
        };

        return entity;
    }

    /**
     * Create a ground
     * @param {Physijs.Scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} z 
     * @param {Number} width 
     * @param {Number} depth 
     * @param {{}} parameters
     */
    static createGround(scene, x, y, z, width, depth, parameters = {})
    {
        let geo = new THREE.PlaneGeometry(width, depth, 6, 6);
        let mat = Physijs.createMaterial(new THREE.MeshPhongMaterial(parameters.material), .9, .2);
        
        let mesh = new Physijs.BoxMesh(geo, mat, 0);
        mesh.position.set(x, y, z);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        
        mesh._physijs.collision_type = CollisionFlags.Ground;
        mesh._physijs.collision_mask = CollisionFlags.All & ~CollisionFlags.Ground;

        scene.add(mesh);

        let modifier = parameters.modifier || 1;

        let entity = ECS.Entity.createBlueprint()
            .addComponent(Components.Physics.type, Components.Physics.data("ground", mesh))
            .addComponent(Components.TargetDestroyer.type, Components.TargetDestroyer.data(modifier))
            .build("ground");

        entity.onDestroy = () =>
        {
            scene.remove(mesh);
            geo.dispose();
            mat.dispose();
        };

        return entity;
    }
}