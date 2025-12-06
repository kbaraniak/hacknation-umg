from classes import *


if __name__ == "__main__":
    print("Loading data via JSONLoader...")

    dict2007 = PKDDictionary("data/pkd_2007.json")
    dict2025 = PKDDictionary("data/pkd_2025.json")

    map_2007_2025 = PKDMap("data/map_2007_2025.json")
    map_2025_2007 = PKDMap("data/map_2025_2007.json")

    dict2007.display(limit=50)