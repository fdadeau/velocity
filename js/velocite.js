"use strict";
    
document.addEventListener("DOMContentLoaded", async function(_e) {
    
    // Bloc contenant l'affichage de la rue avec la station
    const main = document.querySelector("main");
    
    // tableau de stations 
    var stations = await initialiser();
    // station actuellement affichée 
    var station = null;
    
    // ensemble de tous les personnages créés
    var characters = new CharacterSet();

    // objet map leaflet
    var mymap;
    
    
        
    /** Constantes utiles pour le placement des personnages (ratio) : */
    const Y_HAUT_PIED = 0.325;
    const Y_BAS_PIED = 0.635;
    const Y_HAUT_VELO = 0.36;
    const Y_BAS_VELO = 0.59;
    const X_PASSAGE_GAUCHE = 0.435;
    const X_PASSAGE_DROITE = 0.46;

    
    /**
     *  Initialisation de l'IHM : 
     *  - récupération des stations 
     *  - affichage sur la carte
     */
    async function initialiser() { 
        
        var stations = [];
    
        // récupération de la liste de stations
        var response = await fetch("./js/all_stations.json");  
        if (response.status == 200) {
            var data = await response.json();
            // utilisé pour calculer la moyenne des lattitudes/longitudes pour centrer la carte
            var totalLat = 0;
            var totalLong = 0;
            for (var i=0; i < data.stations.length; i++) {
                // stockage des stations
                stations.push(data.stations[i]);
                totalLat += data.stations[i].latitude;
                totalLong += data.stations[i].longitude;
            }
        }
    
        // définition de la carte 
        mymap = L.map('map', { 
            center: [totalLat/stations.length, totalLong/stations.length], 
            zoom: 15 
        });
        // tileset de la carte 
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', { 
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mymap);
        // ajout des markers        
        for (let i in stations) {
            
            stations[i].index = i;
            stations[i].marker = L.marker([stations[i].latitude, stations[i].longitude])
            .addTo(mymap)
            .bindPopup("...");
            
            updatePopupStation(stations[i]);
            
        }
        
        return stations;
    }
    
    
    /**
     *  Assigne un contenu à la popup de la station.
     */
    function updatePopupStation(st) {
        // contenu dynamide la popup : nom de la station + nb bornes & vélos
        var description = document.createElement("aside");
        description.innerHTML = 
            "<h4>" + st.nom + "</h4>" +
            "<p>Nombre de bornes : " + st.bornes.length + "<br>" +
            "Nombre de vélos disponibles : " + st.bornes.filter(function(b) { return b != null; }).length + "</p>";
        // bouton permettant de visualiser la station
        var btnVoir = document.createElement("button");
        btnVoir.className = "btnVoir";
        btnVoir.setAttribute("data-index", st.index);
        btnVoir.addEventListener("click", function() {
            showStation(1*this.dataset.index); 
            mymap.closePopup();
        });
        description.appendChild(btnVoir);
        st.marker._popup.setContent(description);
    }
    
    
    /** 
     *  Affichage de la rue et de la station
     *  @param  Number  i   indice de la station dans le tableau correspondant.
     */    
    function showStation(i) {
        // mise à jour station courante 
        station = stations[i];
        var html = "<h3>" + station.nom + "</h3>";
        // mise à jour des bornes de la station 
        for (var i in station.bornes) {
            html += '<div class="borne" data-index="' + i + '"';
            if (station.bornes[i] != null) {
                html += ' data-velo="' + station.bornes[i].id + '"';
            }
            html += '></div>';
        }
        document.querySelector("main #bornes").innerHTML = html;
        // ajout des personnages présents dans la station 
        var spritesInStation = document.querySelectorAll("main .sprite");
        for (var c=0; c < spritesInStation.length; c++) {
            main.removeChild(spritesInStation[c]);
        }
        // ajout des personnages présents dans la station 
        characters.displayInStation(station);
        // choix du prochain personnage
        document.getElementById("btnAddCharacter").className = "sprite" + (Math.random()*8 | 0);
        // si personnage sélectionné, on le fait entrer dans la station
        if (characters.current) {
            var dist = distanceBetweenStations(characters.current.station, station);
            var nbMinutes = dist * 1.1 * 4 | 0;
            for (var i=0; i < nbMinutes; i++) {
                timer.updateHorloge();  
            }
            characters.current.station = station;
            characters.current.entersStation();
        }
        // bascule de l'affichage
        document.body.classList.remove("showMap");      
    }
    
    
    /**
     *  Calcul de la distance en Km entre deux stations. 
     *  cf. https://www.movable-type.co.uk/scripts/latlong.html
     */
    function distanceBetweenStations(s1, s2) {
        var lat1 = s1.latitude, lat2 = s2.latitude;
        var lon1 = s1.longitude, lon2 = s2.longitude;
        
        const R = 6371; // kilometres
        const phi1 = lat1 * Math.PI/180; // phi, lambda in radians
        const phi2 = lat2 * Math.PI/180;
        const deltaphi = (lat2-lat1) * Math.PI/180;
        const deltalambda = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(deltaphi/2) * Math.sin(deltaphi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltalambda/2) * Math.sin(deltalambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return  (R * c); 
    }
    
    
    /** 
     *  Affichage de la carte avec toutes les stations
     */
    function showMap() {
        // mise à jour station courante 
        station = null;
        // bascule de l'affichage 
        document.body.classList.add("showMap");      
    }
    

    /** 
     *  Boucle de jeu. Utilisée pour 
     */
    function mainloop() {
        if (station) {
            // mise à jour des personnages dans la station   
            characters.updateDisplay(station);
        }
        // "double buffering"
        requestAnimationFrame(mainloop);
    }
    mainloop();
    
    
    
    
    /******************************************************************
     *              Ecouteurs d'événements sur l'IHM
     ******************************************************************/
    
    // clic sur le bouton "Voir la map"
    document.getElementById("btnMap").addEventListener("click", function() {
        if (characters.current == null) {
            showMap();
            mymap.invalidateSize();
        }
    }); 
    
    // clic sur le bouton pour ajouter un personnage
    document.getElementById("btnAddCharacter").addEventListener("click", function() {
        let sprite = this.classList.item(0);
        let c = characters.addCharacter(station, sprite);
        this.classList.remove(sprite);
        this.classList.add("sprite" + (Math.random()*8 | 0));
        characters.select(c);
        c.entersStation();
    });
            
    // clic sur le bouton Exit 
    document.getElementById("btnExit").addEventListener("click", function() {
        console.log(characters.current);
        if (characters.current && characters.current.state == 1) {
            characters.removeCharacter(characters.current);
        }
    });
            
   
    
    // fenêtre principale (IHM rue avec station)
    main.addEventListener("click", function(e) {
        
        // clic sur une borne
        if (e.target.classList.contains("borne")) {
            // si personnage sélectionné 
            if (characters.current) {
                characters.current.goTo(32 + 4*e.target.dataset.index, Y_HAUT_PIED * 100 - 2, function(target) { 
                    var velo = station.bornes[target.dataset.index];
                    // si le personnage n'a pas déjà un vélo et s'il y a un vélo
                    if (characters.current.bike == null && velo) {
                        var strVelo = "Vélo cadre " + velo.cadre + velo.options.map(e => "\n - " + e).join('') + "\nCoût horaire : " + velo.cout + "€\n";
                        if (confirm(strVelo + "\nVoulez-vous l'emprunter ?")) {
                            characters.current.setBike(velo);
                            station.bornes[target.dataset.index] = null;
                            target.removeAttribute("data-velo");
                            updatePopupStation(station);
                        }
                    }
                    // si le personnage a déjà un vélo et que la borne est vide
                    else if (characters.current.bike && velo == null) {
                        if (confirm("Reposer le vélo à cette borne ?")) {
                            station.bornes[target.dataset.index] = characters.current.bike;
                            target.setAttribute("data-velo", characters.current.bike.id);
                            characters.current.setBike(null);
                            updatePopupStation(station);
                        }
                    }
                }.bind(null, e.target));  
            }
            return;
        }
        
        
        // click on sprite
        if (e.target.classList.contains("sprite")) {
            let c = characters.getCharacterFromElement(e.target);
            // if in movement, impossible to change
            if (c == null || c.destination.vecX != null) {
                return;
            }
            if (characters.current && characters.current.destination.vecX != null) {
                return;   
            }
            characters.select(c);   
            return;
        }
        
        // clic sur un bouton de sortie 
        if (e.target.classList.contains("btnExitStation")) {
            if (!characters.current || !characters.current.bike) {
                return;   
            }
            if (e.target.id.endsWith("Droite")) {
                characters.current.goTo(105, Y_BAS_VELO * 100, function() { showMap(); mymap.invalidateSize(); } );
            }
            else {
                characters.current.goTo(-5, Y_HAUT_VELO * 100, function() { showMap(); mymap.invalidateSize(); } );
            }
            return;
        }
        
        // clic sur le fond d'écran --> détermine le point le plus proche.
        if (characters.current) {
            var rect = this.getBoundingClientRect();
            var point = determinePointPlusProche(e.clientX - rect.x, e.clientY - rect.y, rect);
            characters.current.goTo(point.x, point.y, null);    
        }
        
    });
    
     
    /**
     *  Calcule le point le plus proche d'une paire de coordonnées
     *  @param      number  x   abscisses (en pixels)
     *  @param      number  y   ordonnées (en pixels)
     *  @return     Object  { x: _%, y: _% }
     */
    function determinePointPlusProche(x, y, rect) {
            
        const TOP = (characters.current.bike ? Y_HAUT_VELO : Y_HAUT_PIED) * rect.height;
        const BOTTOM = (characters.current.bike ? Y_BAS_VELO : Y_BAS_PIED) * rect.height;
        const LEFT = X_PASSAGE_GAUCHE * rect.width;
        const RIGHT = X_PASSAGE_DROITE * rect.width;
        
        // partie supérieure 
        if (y <= TOP) {
            return { x: x * 100 / rect.width, y: TOP * 100 / rect.height };    
        }
        // partie inférieure 
        if (y >= BOTTOM) {
            return { x: x * 100 / rect.width, y: BOTTOM * 100 / rect.height };    
        }
        // partie centrale 
        var point = { x: x * 100 / rect.width, y: y * 100 / rect.height };
        var distTOP = y - TOP;
        var distBOTTOM = BOTTOM - y;
        var distLEFT = Math.abs(LEFT - x);
        var distRIGHT = Math.abs(RIGHT - x);
        // partie supérieure
        if (distTOP <= distBOTTOM) {
            // plus proche du haut que de la partie centrale
            if (distTOP < distLEFT && distTOP < distRIGHT) {
                point.y = TOP * 100 / rect.height;   
            }
            // partie centrale plus proche
            else {
                point.x = (distLEFT < distRIGHT) ? LEFT * 100 / rect.width : RIGHT * 100 / rect.width;
            }
        }
        else {
            // plus proche du bas que de la partie centrale
            if (distBOTTOM < distLEFT && distBOTTOM < distRIGHT) {
                point.y = BOTTOM * 100 / rect.height;   
            }
            // partie centrale plus proche
            else {
                point.x = (distLEFT < distRIGHT) ? LEFT * 100 / rect.width : RIGHT * 100 / rect.width;
            }
        }
        return point;
    }
    
    
    //showStation(0);
    
    /***************************************************************
                        Gestion des personnages
    ***************************************************************/    

    /**
     *  Classe représentant un ensemble de personnages. 
     */
    function CharacterSet() {
    
        /** Set of characters **/
        this.characters = [];
        
        /** The currently selected character **/
        this.current = null;
    
        let index = 0;
        
        /**
         *  Adds a character to the current set of characters. 
         *  @param      Station     st  the current station in which the character is created.
         */
        this.addCharacter = function(st, sprite) {
            let newChar = new Character(st, sprite);
            newChar.element.id = "user" + (index++);
            this.characters.push(newChar);
            return newChar;
        }
        
        /**
         *  Removes a character from the set of characters.
         *  @param  Character   c   the character to remove
         */
        this.removeCharacter = function(c) {
            if (c.state != 1) {
                return;   
            }
            if (c.bike) {
                return;   
            }
            // désélectionne le personnage
            this.select(c);
            // le passe dans l'état "OUTGOING"
            c.state = 2;
            // recherche sortie la plus proche
            c.goTo((c.position.x < 50 ? -5 : 105), 
                   (c.position.y > (100 * (Y_BAS_PIED + Y_HAUT_PIED) / 2)) ? Y_BAS_PIED * 100 : Y_HAUT_PIED * 100, function() {
                c.element.parentNode.removeChild(c.element);
                this.characters.splice(this.characters.indexOf(c), 1);
            }.bind(this));
        }
         
        /**
         *  Selects/unselects the character in parameter.
         *  
         */
        this.select = function(c) {
            // currently selected character
            if (this.current != null) {
                this.current.select(); 
                // if re-selects --> remove selection and return
                if (this.current == c) {
                    document.body.classList.remove("selected");
                    this.current = null;
                    return;
                }
            }
            // newly selected character
            this.current = c;
            this.current.select();
            document.body.classList.add("selected");
        }
        
        /** 
         *  Adds the characters to the current station (in parameter)
         */
        this.displayInStation = function(st) {
            this.characters.forEach(function(c) {
                if (c.station == st) {
                    main.appendChild(c.element);
                }
            });
        }
        
        /**
         *  Retrieves the current character from its HTML element. 
         */
        this.getCharacterFromElement = function(elt) {
            for (let char of this.characters) {
                if (char.element == elt) {
                    return char;
                }
            }
            return null;
        }
        
        /** 
         *  Re-evaluate character position.
         */
        this.updateDisplay = function(st) {
            this.characters.forEach(function(c) {
                if (c.station == st) {
                    c.update();   
                }
            });
        }
    };
    
        
    /** 
     *  Classe représentant un personnage.
     *  @param  Station     st   Station à laquelle le personnage démarre
     */
    function Character(st, sprite) {
    
        /** Station dans laquelle le personnage est situé */
        this.station = st;
        
        /** Velo emprunté par le personnage */
        this.bike = null;
        
        /** Information d'affichage */
        this.position = {x: 0, y: 0};
        
        /** Consommation du personnage */
        this.facture = 0;
        this.nbEmpruntsPlusDe5min = 0;
        this.debut = 0; 
        
        
        // Vitesse de déplacement
        const SPEED_0 = 0.2;
        const SPEED_1 = 0.3;
        
        this.speed = SPEED_0;
        
        
        // Etats du personnage 
        const ARRIVING = 0, INSIDE = 1, LEAVING = 2;
        this.state = ARRIVING;
        
        // Current destination of the character 
        this.destination = { vecX: null, vecY: null, x: [], y: [], after: null };
        
        // Definition of the sprite element  
        this.element = document.createElement("div");
        this.element.classList.add("sprite");
        this.element.classList.add(sprite ? sprite : ("sprite" + (Math.random() * 8 | 0)));
        

        /** 
         * Réalise l'entrée d'un personnage dans la station (d'un côté ou de l'autre de la rue)
         */ 
        this.entersStation = function() {
            // Positionnement initial  
            this.position.x = (Math.random() < 0.5) ? -5 : 105;
            this.position.y = (Math.random() < 0.5) ?  Y_HAUT_PIED * 100 : Y_BAS_PIED * 100; 
            // correction si en vélo (pour respecter le sens de circululation)
            if (this.bike) {
                this.position.y = this.position.x < 0 ? Y_BAS_VELO * 100 : Y_HAUT_VELO * 100;       
            }   
            // 
            this.element.style.left = this.position.x + "%";
            this.element.style.top = this.position.y + "%";            
            // add the child to the station
            main.appendChild(this.element);
            this.state = ARRIVING;
            // démarre l'animation
            var percentage = this.bike ? 20 : 10;
            this.goTo(this.position.x < 0 ? percentage : 100 - percentage, this.position.y, function() { this.state = INSIDE; }.bind(this));
        }
        
        
        /**
         *  Initiates movement to a given direction. 
         */
        this.goTo = function(destX, destY, after) {
            
            var path = this.getPathTo(destX, destY);
            
            this.destination.x = path.x;
            this.destination.y = path.y;
            this.destination.vecX = null;
            this.destination.vecY = null;
            this.destination.after = after;
        }
        
        
        /** 
         *  Calcule le chemin pour rejoindre un point donné
         */
        this.getPathTo = function(destX, destY) {
            var Y_HAUT = this.bike ? Y_HAUT_VELO : Y_HAUT_PIED;
            var Y_BAS = this.bike ? Y_BAS_VELO : Y_BAS_PIED;
            
            // determine le chemin à parcourir pour rejoindre 
            var tabX = [destX];
            var tabY = [destY];
            
            // personnage sur la même ordonnée
            if (tabY[0] == this.position.y) {
                return { x: tabX, y: tabY };
            }

            // si sur une borne (au dessus de la limite haute) 
            if (destY < 100 * Y_HAUT_PIED) {
                tabX.unshift(tabX[0]);
                tabY.unshift(100 * Y_HAUT);
            }

            // personnage sur la même ordonnée
            if (tabY[0] == this.position.y) {
                return { x: tabX, y: tabY };
            }
            
            // en vélo --> traversée directe de la route
            if (this.bike) {
                tabX.unshift(this.position.x);   
                tabY.unshift(tabY[0]);                   
                return { x: tabX, y: tabY };
            }

            // A PIED : cas personnage plus haut que sa destination
            if (this.position.y < tabY[0]) {
                // --> rejoint la gauche du passage pieton
                tabX.unshift(X_PASSAGE_GAUCHE * 100);
                tabY.unshift(tabY[0]);
                // si nécessaire, descend jusqu'au passage 
                if (this.position.y <= 100 * Y_HAUT) {
                    tabX.unshift(tabX[0]);   
                    tabY.unshift(100 * Y_HAUT);   
                }
                return { x: tabX, y: tabY };
            }
            
            // A PIED : cas personnage plus bas   

            // --> rejoint la droite du passage 
            tabX.unshift(100 * X_PASSAGE_DROITE);
            tabY.unshift(tabY[0]);
            // si nécessaire, monte jusqu'au passage 
            if (this.position.y >= 100 * Y_BAS) {
                tabX.unshift(tabX[0]);   
                tabY.unshift(100 * Y_BAS);   
            }
            return { x: tabX, y: tabY };
        }
        
        
        // constante évaluant la distance minimale 
        var EPSILON = 0.1;
        
        /**
         *  Attribution d'un vélo au personnage : 
         *  - mise à jour de l'affichage
         *  - changement de vitesse
         *  - enregistrement de l'emprunt ou du retour (avec mise à jour de la facturation)
         */
        this.setBike = function(b) {
            if (b) {
                this.speed = SPEED_1;     
                EPSILON = SPEED_1;
                this.element.classList.add("onbike");
                document.body.classList.add("onbike");
                // facturation
                this.debut = timer.current;
            }
            else {
                this.speed = SPEED_0;     
                EPSILON = SPEED_0;
                this.element.classList.remove("onbike");
                document.body.classList.remove("onbike");
                // facturation 
                var duree = (timer.current - this.debut);
                var coeff = 100;
                if (duree >= 5) {
                    [10,20,30,40,50].forEach(function(e) {
                        if (this.nbEmpruntsPlusDe5min > e) {
                            coeff -= 10;   
                        }
                    }.bind(this));             
                    this.nbEmpruntsPlusDe5min++;   
                }
                this.facture += duree / 60 * (this.bike.cout * coeff / 100); 
            }
            this.bike = b;
            this.updateIcone();
        }
        
        /** 
         *  Visualisation des caractéristiques du personnage sélectionné
         *  - si vélo : caractéristiques du vélo
         *  - si pas de vélo : info pas d'emprunt + facture actuelle
         */
        this.updateIcone = function() {
            document.getElementById("icone").innerHTML = 
                "<span class='sprite " + sprite + (this.bike ? " arretD onbike" : " arretB") + "'></span>" + 
                ((this.bike) ?
                "<p>Vélo cadre " + this.bike.cadre + "<br><span>" + (this.bike.options.length == 0 ? "Sans option" : this.bike.options.join(", ")) + "</span></p>" : 
                "<p>Pas d'emprunt en cours</p><aside>Facture courante : " + this.facture.toFixed(2) + " €</aside>");
        }
        

        
        /**
         *  Updates the current character position.
         */
        this.update = function() {

            // if no motion --> return
            if (this.destination.x.length == 0) {
                return; 
            }
            
            // compute distance
            let dist = distance(this.destination, this.position);
            // if too close // --> return 
            if (dist < EPSILON) {
                this.position.x = this.destination.x[0];
                this.position.y = this.destination.y[0];
                this.destination.x.shift();
                this.destination.y.shift();
                this.orientation();
                this.destination.vecX = null;
                if (this.destination.x.length == 0) {
                    this.element.classList.remove("animation");
                    if (this.destination.after) {
                        this.destination.after();
                    }
                }
                return;   
            }

            // if the character is not in motion
            if (this.destination.vecX == null) {
                // compute direction vector
                this.destination.vecX = (this.destination.x[0] - this.position.x) / dist;
                this.destination.vecY = (this.destination.y[0] - this.position.y) / dist;
                // determine orientation
                this.orientation(this.destination.vecX, this.destination.vecY);
                this.element.classList.add("animation");
            }
                                    
            // compute next position
            this.position.x = this.position.x + this.speed * this.destination.vecX;
            this.position.y = this.position.y + this.speed * this.destination.vecY;
            // update element display
            this.element.style.top = this.position.y + "%";
            this.element.style.left = this.position.x + "%";
            this.element.style.zIndex = this.position.y * 10 | 0;
        }
        
        
        function distance(p1, p2) {
             return Math.sqrt((p1.x[0] - p2.x) * (p1.x[0] - p2.x) + (p1.y[0] - p2.y) * (p1.y[0] - p2.y));
        }

        /** Set the character orientation */
        this.orientation = function(vecX, vecY) {
            this.element.classList.remove("arretD");   
            this.element.classList.remove("arretG");   
            this.element.classList.remove("arretH");   
            this.element.classList.remove("arretB");
            this.element.classList.remove("marcheD");   
            this.element.classList.remove("marcheG");   
            this.element.classList.remove("marcheH");   
            this.element.classList.remove("marcheB");
            if (this.destination.x.length == 0 || this.speed < 0.1) {
                if (this.bike) {
                    this.element.classList.add("arret" + (this.destination.vecY < -0.5 ? "H" : 
                                                            this.destination.vecY > 0.5 ? "B" : 
                                                            this.destination.vecX > 0.5 ? "D" : "G"));   
                }
                else {
                    this.element.classList.add("arret" + (this.destination.vecY < -0.5 ? "H" : "B"));
                }
                return;
            }
            if (vecX > 0.5) {
                this.element.classList.add("marcheD");
                return;
            }
            if (vecX < -0.5) {
                this.element.classList.add("marcheG");
                return;
            }
            if (vecY > 0.5) {
                this.element.classList.add("marcheB");
                return;
            }
            this.element.classList.add("marcheH"); 
        }
        
        
        /** 
         *  Selects this character 
         */
        this.select = function() {
            this.element.classList.toggle("selected");
            this.updateIcone();
        }
        
        /**
         *  Checks if the character is selected. 
         */
        this.isSelected = function() {
            return this.element.classList.contains("selected");   
        }
        
    }
    
    
    
    /********************************************************************** 
     *           Objet gérant l'horaire courant et son affichage.
     **********************************************************************/
    var timer = {
        /** Horaire courant (en minutes) */
        current : (Math.random()  * 60 * 24) | 0,
        /** Démarrage du chronomètre */
        init: function() { 
            if (this.current < 7*60 + 50 || this.current > 21 * 60 + 50) {
                main.style.filter = "brightness(0.5)";     
                main.classList.add("lightsOn");
            }
            this.updateHorloge();
            this.interval = setInterval(this.updateHorloge.bind(this), 500); 
        },
        /** Mise à jour de l'affichage */
        updateHorloge: function() {
            this.current++;
            var heures = this.current % (24*60) / 60 | 0;
            var minutes = this.current % 60 | 0;
            document.querySelector("#horloge").innerHTML = heures + ":" + (minutes < 10 ? "0" : "") + minutes;
            // diminution de la visibilité entre 20h et 21h --> coucher du soleil 
            if (heures == 20) {
                main.style.filter = "brightness(" + ((59-minutes) / 59 * 0.5 + 0.5) + ")";
                if (minutes == 50) {    // --> allumage des lampadaires
                    main.classList.add("lightsOn");
                }
            }
            else if (heures == 7) {
                main.style.filter = "brightness(" + (((minutes - 59) / 59 * 0.5 + 1)) + ")";  
                if (minutes == 50) {    // --> extinction des lampadaires
                    main.classList.remove("lightsOn");
                }
            }
            if (main.classList.contains("lightsOn")) {
                document.getElementById("light0").style.visibility = (Math.random() < 0.5) ? "visible" : "hidden";
            }
        }
    };
    timer.init();
    

});    
