class SystemFactory
{
    static createScoreSystem()
    {
        // Create difficulty hud element
        let hud = document.createElement("div");
        hud.id = "Score";
        hud.textContent = "Score: 0";
        hud.style =
        "\
            pointer-events: none; \
            position: absolute; \
            top: 10px; \
            right: 10px; \
            margin: 0; \
            padding: 0; \
            color: #FFFFFF; \
            z-index: 100; \
            display: block; \
            text-shadow: -1px -1px 0 1px -1px 0 -1px 1px 0 1px 1px 0; \
            font-family: input, courier, arial;\
            font-size: 40px; \
            font-weight: bold; \
            \
        ";

        document.body.appendChild(hud);

        // Create system
        let system = ECS.System.create(Components.Target.type);
        let score = 0;

        ECS.EntityDestroyed.addListener(function(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                score += entity.getComponent(Components.Target.type).value;
                hud.textContent = "Score: " + score;
            }
        });

        return system;
    }

    static createCleanerSystem()
    {
        let system = ECS.System.create();

        system.setUpdate(function()
        {
            let components = ECS.Component.getComponents(Components.Physics.type);

            for (let c of components)
            {
                if (c.mesh.position.y < -2)
                {
                    ECS.Entity.destroy(c.owner);
                }
            }
        });
    }

    static createHealthSystem()
    {
        let system = ECS.System.create(Components.Physics.type, Components.Health.type);
        let destroyerSignature = new ECS.Signature([Components.Physics.type, Components.TargetDestroyer.type]);
        let modifiers = new Map();

        ECS.EntityCreated.addListener(function(entity)
        {
            if (entity.containsSignature(destroyerSignature))
            {
                let mesh = entity.getComponent(Components.Physics.type).mesh;
                let modifier = entity.getComponent(Components.TargetDestroyer.type).modifier;

                modifiers.set(mesh, modifier);
            }

            if (system.canOperateOnEntity(entity))
            {
                let mesh = entity.getComponent(Components.Physics.type).mesh;
                let health = entity.getComponent(Components.Health.type);

                let onCollision = function(other, linearVelocity, angularVelocity, normal)
                {
                    let modifier = modifiers.get(other);
    
                    if (modifier !== undefined)
                    {
                        let target = entity.getComponent(Components.Target.type);
    
                        if (target !== undefined)
                        {
                            target.value *= modifier;
                            health.shift(-health.max);
                            return;
                        }
                    }
    
                    let sumLengthsSquared = linearVelocity.lengthSq() + angularVelocity.lengthSq();
                    let sumOfDots = Math.abs(linearVelocity.dot(normal)) + Math.abs(angularVelocity.dot(normal));
                    let totalForce = other.mass * sumLengthsSquared * sumOfDots;
                    let shiftAmount = Math.round(-totalForce / 10000);
    
                    if (shiftAmount < 0)
                    {
                        health.shift(shiftAmount);
                    }
                    
                };
    
                let onShift = function(current)
                {
                    if (current <= 0)
                    {
                        health.removeListener(onShift);
                        mesh.removeEventListener('collision', onCollision);
                        setTimeout(() => ECS.Entity.destroy(entity), 100);
                    }
                }
    
                health.addListener(onShift);
                mesh.addEventListener('collision', onCollision);
            }
        });

        ECS.EntityDestroyed.addListener(function(entity)
        {
            if (entity.containsSignature(destroyerSignature))
            {
                modifiers.delete(entity.getComponent(Components.Physics.type).mesh);
            }
        });

        return system;
    }

    /**
     * Create cannon controls system
     * @param {Physijs.Scene} scene 
     */
    static createCannonControlSystem(scene)
    {
        let system = ECS.System.create(Components.Physics.type, Components.DOFConstraint.type, Components.CannonControls.type);

        function f(key)
        {
            return Key.isDown(key) ? 1 : 0;
        }

        system.setUpdate(function()
        {
            let mesh, constraint, controls, dir;
            let limit = Math.PI / 4;

            for (let node of this.nodes)
            {
                mesh = node.physics.mesh;
                constraint = node.constraint.constraint;
                controls = node.controls;

                if (!controls.active) continue;

                constraint.configureAngularMotor(1, -limit, limit,
                    controls.bearing.velocity * (f(controls.bearing.up) - f(controls.bearing.down)), controls.bearing.force);
                constraint.configureAngularMotor(0, -limit, 0.001,
                    controls.elevation.velocity * (f(controls.elevation.down) - f(controls.elevation.up)), controls.elevation.force);

                if (Key.isDown(controls.fire) && Date.now() - controls.fireTime >= controls.fireDelay)
                {
                    let length = controls.length;
                    let axis = constraint.getDefinition().axisa;
                    let position = mesh.position;
                    let rotation = mesh.rotation;

                    let bearing = -rotation.z - Math.PI / 2;
                    let elevation = rotation.x - axis.x;

                    let direction = new THREE.Vector3(
                        Math.cos(bearing) * Math.cos(elevation),
                        Math.sin(elevation),
                        Math.sin(bearing) * Math.cos(elevation)
                    );

                    let shotForce = 500;
                    let firePosition = position.clone().add(direction.clone().multiplyScalar(length - 1));
                    let fireForce = direction.clone().multiplyScalar(shotForce);

                    EntityFactory.createCannonBall(scene, firePosition.x, firePosition.y, firePosition.z, 1, fireForce,
                        { density: 2, material: { color: 0x494b4c } });
                    controls.fireTime = Date.now();
                }
            }
        });

        let onEntityCreated = function(entity)
        {
            if (system.canOperateOnEntity(entity))
            {
                let node = { owner: entity };
                node.physics = entity.getComponent(Components.Physics.type);
                node.controls = entity.getComponent(Components.CannonControls.type);
                node.constraint = entity.getComponent(Components.DOFConstraint.type);

                system.nodes.add(node);
                system.nodeMap.set(entity, node);

                let constraint = node.constraint.constraint;
                constraint.enableAngularMotor(0);
                constraint.enableAngularMotor(1);
            }
        }

        ECS.System.StandardMethods.init(system)();
        ECS.EntityCreated.addListener(onEntityCreated);
        ECS.EntityDestroyed.addListener(ECS.System.StandardMethods.onEntityDestroyed(system));
    }
}