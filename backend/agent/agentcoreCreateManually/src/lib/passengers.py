"""
Passenger and flight utilities
"""
import random
import datetime


AIRLINES = ['UA', 'LH', 'BA', 'AF', 'DL']
HUBS = ['ORD', 'ATL', 'DFW', 'LAX', 'MUC', 'LHR', 'CDG']


def generate_flight_options(origin: str, destination: str, tier: str, count: int = 5, constraints: list = None) -> list:
    """
    Generate mock flight rebooking options
    """
    print(f"[PASSENGERS] Generating {count} options for {origin}->{destination}, tier={tier}")
    
    options = []
    base_time = datetime.datetime.now() + datetime.timedelta(hours=2)
    
    for i in range(count):
        option_id = chr(65 + i)  # A, B, C, D...
        
        # Determine if direct or connecting
        is_direct = i < 2 or random.random() < 0.4
        
        if is_direct:
            # Direct flight
            flight_num = f"{random.choice(AIRLINES)}{random.randint(1000, 9999)}"
            depart_time = base_time + datetime.timedelta(minutes=random.randint(15, 240))
            duration = datetime.timedelta(hours=random.randint(6, 10))
            arrive_time = depart_time + duration
            
            routing = f"{origin}→{destination} (direct)"
            stops = 0
            flights = [flight_num]
        else:
            # Connecting flight
            hub = random.choice([h for h in HUBS if h not in [origin, destination]])
            flight1 = f"{random.choice(AIRLINES)}{random.randint(1000, 9999)}"
            flight2 = f"{random.choice(AIRLINES)}{random.randint(1000, 9999)}"
            
            depart_time = base_time + datetime.timedelta(minutes=random.randint(15, 240))
            leg1_duration = datetime.timedelta(hours=random.randint(2, 5))
            layover = datetime.timedelta(hours=random.randint(1, 3))
            leg2_duration = datetime.timedelta(hours=random.randint(3, 6))
            arrive_time = depart_time + leg1_duration + layover + leg2_duration
            
            routing = f"{origin}→{hub}→{destination}"
            stops = 1
            flights = [flight1, flight2]
        
        # Determine class based on tier
        if tier == 'Platinum':
            cabin_class = random.choice(['Business', 'Business', 'First'])
        elif tier == 'Gold':
            cabin_class = random.choice(['Premium Economy', 'Business'])
        else:
            cabin_class = random.choice(['Economy', 'Premium Economy'])
        
        # Pricing
        base_cost = 0 if tier in ['Platinum', 'Gold'] else random.randint(0, 300)
        
        # Compatibility score
        compatibility = round(random.uniform(0.7, 0.98), 2)
        
        option = {
            'optionId': option_id,
            'routing': routing,
            'departure': depart_time.strftime('%H:%M'),
            'arrival': arrive_time.strftime('%H:%M'),
            'duration': str(arrive_time - depart_time).split('.')[0],
            'stops': stops,
            'flights': flights,
            'class': cabin_class,
            'cost': base_cost,
            'availability': 'confirmed',
            'compatibility': compatibility,
            'confidence': round(random.uniform(0.8, 0.95), 2)
        }
        
        options.append(option)
    
    # Sort by compatibility
    options.sort(key=lambda x: x['compatibility'], reverse=True)
    
    return options
