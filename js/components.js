let Components = (function()
{
    let count = 0;

    function create(dataFunction)
    {
        return ECS.Component.createBlueprint(count++, dataFunction);
    }
    
    const Physics = create((tag, mesh) =>
    {
        mesh.tag = tag;
        mesh.entity = undefined;

        return { mesh: mesh };
    });

    const DOFConstraint = create((constraint) =>
    ({
        constraint: constraint
    }));

    const Target = create((value) =>
    ({
        value: value
    }));

    const Health = create((max, current = undefined) =>
    {
        max = Math.max(0, max);
        
        let health = current === undefined ? max : Math.min(Math.max(0, current), max);
        let shifted = new ECS.Event();

        let data =
        {
            get max() { return max; },
            addListener: (listener) => shifted.addListener(listener),
            removeListener: (listener) => shifted.removeListener(listener),
            shift: function(amount)
            {
                health = Math.min(Math.max(0, health + amount), this.max);
                shifted.trigger(health);
            }
        }

        return data;
    });

    const CannonControls = create((bearingUp, bearingDown, bearingVelocity, bearingForce,
            elevationUp, elevationDown, elevationVelocity, elevationForce, fireButton, length) =>
    ({
        active: true,
        bearing: { up: bearingUp, down: bearingDown, velocity: bearingVelocity, force: bearingForce },
        elevation: { up: elevationUp, down: elevationDown, velocity: elevationVelocity, force: elevationForce },
        fire: fireButton,
        fireDelay: 1000,
        fireTime:0,
        elevationPressed: new ECS.Event(),
        firePressed: new ECS.Event(),
        bearingPressed: new ECS.Event(),
        length: length
    }));

    const TargetDestroyer = create((modifier = 1) =>
    ({
        modifier: modifier
    }));

    let Components =
    {
        get count() { return count; },
        get Physics() { return Physics; },
        get DOFConstraint() { return DOFConstraint; },
        get Target() { return Target; },
        get Health() { return Health; },
        get CannonControls() { return CannonControls; },
        get TargetDestroyer() { return TargetDestroyer; }
    };

    return Components;
})();