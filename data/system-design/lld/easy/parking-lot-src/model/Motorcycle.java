package model;

public class Motorcycle extends Vehicle {

    public Motorcycle(String licensePlate) {
        super(licensePlate, VehicleType.MOTORCYCLE);
    }

    @Override
    public boolean canFitInSpot(SpotType spotType) {
        // Motorcycle fits in any spot
        return true;
    }
}
