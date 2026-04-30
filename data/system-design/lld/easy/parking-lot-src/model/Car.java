package model;

public class Car extends Vehicle {

    public Car(String licensePlate) {
        super(licensePlate, VehicleType.CAR);
    }

    @Override
    public boolean canFitInSpot(SpotType spotType) {
        return spotType == SpotType.COMPACT || spotType == SpotType.LARGE;
    }
}
