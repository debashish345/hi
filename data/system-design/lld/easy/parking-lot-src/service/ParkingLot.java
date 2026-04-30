package service;

import model.*;
import java.util.ArrayList;
import java.util.List;

public class ParkingLot {
    private static volatile ParkingLot instance;
    private List<ParkingFloor> floors;

    private ParkingLot() {
        this.floors = new ArrayList<>();
    }

    public static ParkingLot getInstance() {
        if (instance == null) {
            synchronized (ParkingLot.class) {
                if (instance == null) {
                    instance = new ParkingLot();
                }
            }
        }
        return instance;
    }

    public void addFloor(ParkingFloor floor) {
        floors.add(floor);
    }

    public ParkingSpot parkVehicle(Vehicle vehicle) {
        for (ParkingFloor floor : floors) {
            ParkingSpot spot = floor.findAvailableSpot(vehicle);
            if (spot != null && spot.assignVehicle(vehicle)) {
                System.out.println("Parked " + vehicle.getLicensePlate() + " at spot " + spot.getSpotId());
                return spot;
            }
        }
        System.out.println("No spot available for " + vehicle.getLicensePlate());
        return null;
    }

    public List<ParkingFloor> getFloors() { return floors; }
}
